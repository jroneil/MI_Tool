import unittest

from fastapi import HTTPException
from sqlalchemy import JSON, String, create_engine
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.orm import Session, sessionmaker

from app.models import Base, Workspace, Model, ModelField, Record
from app.routers.records import validate_record_payload


class AsyncSessionStub:
    def __init__(self, session: Session):
        self._session = session

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def add(self, instance):
        self._session.add(instance)

    async def add_all(self, instances):
        self._session.add_all(instances)

    async def flush(self):
        self._session.flush()

    async def commit(self):
        self._session.commit()

    async def refresh(self, instance, attribute_names=None):
        self._session.refresh(instance, attribute_names=attribute_names)

    async def execute(self, statement):
        return self._session.execute(statement)

    async def delete(self, instance):
        self._session.delete(instance)

    async def close(self):
        self._session.close()


class ValidateRecordPayloadTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:", future=True, connect_args={"check_same_thread": False}
        )
        for table in Base.metadata.tables.values():
            for column in table.columns:
                if isinstance(column.type, JSONB):
                    column.type = JSON()
                if isinstance(column.type, ENUM):
                    column.type = String()
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(
            self.engine, expire_on_commit=False
        )

    async def asyncTearDown(self):
        self.engine.dispose()

    def _async_session(self) -> AsyncSessionStub:
        return AsyncSessionStub(self.session_factory())

    async def _create_workspace(self, session, name="Main Workspace"):
        workspace = Workspace(name=name)
        await session.add(workspace)
        await session.flush()
        return workspace

    async def test_unique_field_blocks_duplicate_values(self):
        async with self._async_session() as session:
            workspace = await self._create_workspace(session)
            model = Model(workspace_id=workspace.id, name="Contacts", slug="contacts")
            unique_field = ModelField(
                model=model,
                name="Email",
                slug="email",
                data_type="string",
                is_unique=True,
            )
            await session.add_all([model, unique_field])
            await session.commit()

            existing = Record(
                model_id=model.id,
                workspace_id=workspace.id,
                data={"email": "duplicate@example.com"},
            )
            await session.add(existing)
            await session.commit()

            with self.assertRaises(HTTPException) as excinfo:
                await validate_record_payload(
                    session, model, {"email": "duplicate@example.com"}
                )

            self.assertEqual(excinfo.exception.status_code, 422)
            self.assertEqual(
                excinfo.exception.detail,
                [{"field": "email", "error": "Value must be unique"}],
            )

    async def test_unique_field_allows_same_record_on_update(self):
        async with self._async_session() as session:
            workspace = await self._create_workspace(session)
            model = Model(workspace_id=workspace.id, name="Contacts", slug="contacts")
            unique_field = ModelField(
                model=model,
                name="Email",
                slug="email",
                data_type="string",
                is_unique=True,
            )
            await session.add_all([model, unique_field])
            await session.commit()

            existing = Record(
                model_id=model.id,
                workspace_id=workspace.id,
                data={"email": "duplicate@example.com"},
            )
            await session.add(existing)
            await session.commit()
            await session.refresh(existing)

            await validate_record_payload(
                session, model, {"email": "duplicate@example.com"}, record_id=existing.id
            )

    async def test_relation_field_requires_existing_record(self):
        async with self._async_session() as session:
            workspace = await self._create_workspace(session)
            target_model = Model(
                workspace_id=workspace.id, name="Accounts", slug="accounts"
            )
            main_model = Model(workspace_id=workspace.id, name="Tasks", slug="tasks")
            await session.add_all([target_model, main_model])
            await session.flush()
            relation_field = ModelField(
                model=main_model,
                name="Owner",
                slug="owner",
                data_type="relation",
                config={"workspace_id": workspace.id, "model_id": target_model.id},
            )
            await session.add(relation_field)
            await session.commit()

            with self.assertRaises(HTTPException) as excinfo:
                await validate_record_payload(session, main_model, {"owner": 999})

            self.assertEqual(excinfo.exception.status_code, 422)
            self.assertEqual(
                excinfo.exception.detail,
                [{"field": "owner", "error": "Related record not found"}],
            )

    async def test_relation_field_validates_model_scope(self):
        async with self._async_session() as session:
            workspace = await self._create_workspace(session)
            target_model = Model(
                workspace_id=workspace.id, name="Accounts", slug="accounts"
            )
            other_model = Model(workspace_id=workspace.id, name="Contacts", slug="contacts")
            main_model = Model(workspace_id=workspace.id, name="Tasks", slug="tasks")
            await session.add_all([target_model, other_model, main_model])
            await session.flush()
            relation_field = ModelField(
                model=main_model,
                name="Owner",
                slug="owner",
                data_type="relation",
                config={"workspace_id": workspace.id, "model_id": target_model.id},
            )
            await session.add(relation_field)
            await session.commit()

            wrong_record = Record(
                model_id=other_model.id,
                workspace_id=workspace.id,
                data={"name": "Should fail"},
            )
            await session.add(wrong_record)
            await session.commit()
            await session.refresh(wrong_record)

            with self.assertRaises(HTTPException) as excinfo:
                await validate_record_payload(
                    session, main_model, {"owner": wrong_record.id}
                )

            self.assertEqual(excinfo.exception.status_code, 422)
            self.assertEqual(
                excinfo.exception.detail,
                [{"field": "owner", "error": "Related record belongs to a different model"}],
            )

    async def test_relation_field_accepts_correct_record(self):
        async with self._async_session() as session:
            workspace = await self._create_workspace(session)
            target_model = Model(
                workspace_id=workspace.id, name="Accounts", slug="accounts"
            )
            main_model = Model(workspace_id=workspace.id, name="Tasks", slug="tasks")
            await session.add_all([target_model, main_model])
            await session.flush()
            relation_field = ModelField(
                model=main_model,
                name="Owner",
                slug="owner",
                data_type="relation",
                config={"workspace_id": workspace.id, "model_id": target_model.id},
            )
            await session.add(relation_field)
            await session.commit()

            related = Record(
                model_id=target_model.id,
                workspace_id=workspace.id,
                data={"name": "Owner"},
            )
            await session.add(related)
            await session.commit()
            await session.refresh(related)

            await validate_record_payload(
                session, main_model, {"owner": related.id}
            )


if __name__ == "__main__":
    unittest.main()

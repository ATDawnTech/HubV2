import pytest
from datetime import datetime, timezone
from src.adthub.db.repositories.project_repository import ProjectRepository
from src.adthub.exceptions import ResourceNotFoundError
from src.adthub.db.models.projects import Project
from tests.factories.project_factory import ProjectFactory, ActiveProjectFactory
from tests.factories.employee_factory import EmployeeFactory


@pytest.mark.integration
def test_find_by_id_returns_project_when_found(db_session) -> None:
    """ProjectRepository.find_by_id returns the correct project."""
    project = ProjectFactory()
    db_session.add(project)
    db_session.flush()

    repo = ProjectRepository(db_session)
    result = repo.find_by_id(project.id)

    assert result is not None
    assert result.id == project.id
    assert result.name == project.name


@pytest.mark.integration
def test_find_by_id_returns_none_when_not_found(db_session) -> None:
    """ProjectRepository.find_by_id returns None for non-existent ID."""
    repo = ProjectRepository(db_session)
    result = repo.find_by_id("proj_doesnotexist")
    assert result is None


@pytest.mark.integration
def test_find_by_id_returns_none_when_soft_deleted(db_session) -> None:
    """ProjectRepository.find_by_id does not return soft-deleted projects."""
    project = ProjectFactory()
    project.deleted_at = datetime.now(timezone.utc)
    db_session.add(project)
    db_session.flush()

    repo = ProjectRepository(db_session)
    result = repo.find_by_id(project.id)

    assert result is None


@pytest.mark.integration
def test_find_all_returns_projects(db_session) -> None:
    """ProjectRepository.find_all returns all active projects."""
    proj1 = ProjectFactory()
    proj2 = ProjectFactory()
    db_session.add_all([proj1, proj2])
    db_session.flush()

    repo = ProjectRepository(db_session)
    results = repo.find_all()
    ids = [r.id for r in results]

    assert proj1.id in ids
    assert proj2.id in ids


@pytest.mark.integration
def test_find_all_excludes_deleted_projects(db_session) -> None:
    """ProjectRepository.find_all does not return soft-deleted projects."""
    active = ProjectFactory()
    deleted = ProjectFactory()
    deleted.deleted_at = datetime.now(timezone.utc)
    db_session.add_all([active, deleted])
    db_session.flush()

    repo = ProjectRepository(db_session)
    results = repo.find_all()
    result_ids = [r.id for r in results]

    assert active.id in result_ids
    assert deleted.id not in result_ids


@pytest.mark.integration
def test_find_all_paginates_with_cursor(db_session) -> None:
    """ProjectRepository.find_all returns the next page when cursor is provided."""
    projects = [ProjectFactory() for _ in range(5)]
    projects.sort(key=lambda p: p.id)
    db_session.add_all(projects)
    db_session.flush()

    repo = ProjectRepository(db_session)
    first_page = repo.find_all(limit=2)
    assert len(first_page) <= 3

    cursor = first_page[1].id
    second_page = repo.find_all(limit=2, cursor=cursor)
    assert all(p.id > cursor for p in second_page)


@pytest.mark.integration
def test_save_creates_project(db_session) -> None:
    """ProjectRepository.save persists a new project."""
    project = ProjectFactory(name="New Project", status="pipeline")

    repo = ProjectRepository(db_session)
    saved = repo.save(project)

    assert saved.id == project.id
    assert saved.name == "New Project"
    assert saved.status == "pipeline"
    assert saved.deleted_at is None


@pytest.mark.integration
def test_save_updates_project_name(db_session) -> None:
    """ProjectRepository.save updates an existing project's name."""
    project = ProjectFactory()
    db_session.add(project)
    db_session.flush()

    project.name = "Updated Name"
    repo = ProjectRepository(db_session)
    repo.save(project)

    result = repo.find_by_id(project.id)
    assert result.name == "Updated Name"


@pytest.mark.integration
def test_soft_delete_sets_deleted_at(db_session) -> None:
    """ProjectRepository.soft_delete sets deleted_at on the record."""
    project = ProjectFactory()
    db_session.add(project)
    db_session.flush()

    repo = ProjectRepository(db_session)
    repo.soft_delete(project.id)

    raw = db_session.query(Project).filter(Project.id == project.id).first()
    assert raw.deleted_at is not None


@pytest.mark.integration
def test_soft_delete_record_no_longer_returned(db_session) -> None:
    """ProjectRepository.soft_delete causes find_by_id to return None."""
    project = ProjectFactory()
    db_session.add(project)
    db_session.flush()

    repo = ProjectRepository(db_session)
    repo.soft_delete(project.id)

    result = repo.find_by_id(project.id)
    assert result is None


@pytest.mark.integration
def test_soft_delete_raises_error_when_not_found(db_session) -> None:
    """ProjectRepository.soft_delete raises ResourceNotFoundError for missing ID."""
    repo = ProjectRepository(db_session)
    with pytest.raises(ResourceNotFoundError):
        repo.soft_delete("proj_doesnotexist")


@pytest.mark.integration
def test_find_by_status_returns_matching_projects(db_session) -> None:
    """ProjectRepository.find_by_status returns projects with the given status."""
    active1 = ActiveProjectFactory()
    active2 = ActiveProjectFactory()
    pipeline = ProjectFactory(status="pipeline")
    db_session.add_all([active1, active2, pipeline])
    db_session.flush()

    repo = ProjectRepository(db_session)
    results = repo.find_by_status("active")
    result_ids = [r.id for r in results]

    assert active1.id in result_ids
    assert active2.id in result_ids
    assert pipeline.id not in result_ids


@pytest.mark.integration
def test_find_by_status_excludes_other_statuses(db_session) -> None:
    """ProjectRepository.find_by_status does not return projects with different statuses."""
    closed = ProjectFactory(status="closed")
    active = ActiveProjectFactory()
    db_session.add_all([closed, active])
    db_session.flush()

    repo = ProjectRepository(db_session)
    results = repo.find_by_status("closed")
    result_ids = [r.id for r in results]

    assert closed.id in result_ids
    assert active.id not in result_ids


@pytest.mark.integration
def test_find_by_manager_returns_managed_projects(db_session) -> None:
    """ProjectRepository.find_by_manager returns projects for the given manager."""
    manager = EmployeeFactory()
    db_session.add(manager)
    db_session.flush()

    managed1 = ProjectFactory(project_manager_id=manager.id)
    managed2 = ProjectFactory(project_manager_id=manager.id)
    other = ProjectFactory()
    db_session.add_all([managed1, managed2, other])
    db_session.flush()

    repo = ProjectRepository(db_session)
    results = repo.find_by_manager(manager.id)
    result_ids = [r.id for r in results]

    assert managed1.id in result_ids
    assert managed2.id in result_ids
    assert other.id not in result_ids

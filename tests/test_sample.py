"""Sample test file to verify pytest setup."""
import pytest


def test_basic_import():
    """Test basic Python imports work."""
    import sys
    assert sys.version_info >= (3, 10)


def test_fastapi_import():
    """Test FastAPI is properly installed."""
    from fastapi import FastAPI
    app = FastAPI()
    assert app is not None


def test_mongodb_import():
    """Test MongoDB dependencies are installed."""
    import pymongo
    assert hasattr(pymongo, '__version__')


def test_pydantic_import():
    """Test Pydantic is installed."""
    from pydantic import BaseModel
    
    class TestModel(BaseModel):
        name: str
    
    model = TestModel(name="test")
    assert model.name == "test"


@pytest.mark.asyncio
async def test_async_support():
    """Test async/await support."""
    async def sample_async():
        return "async works"
    
    result = await sample_async()
    assert result == "async works"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

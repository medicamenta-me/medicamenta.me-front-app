from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="medicamenta-api-client",
    version="1.0.0",
    author="Medicamenta.me",
    author_email="api-support@medicamenta.me",
    description="Official Python SDK for Medicamenta.me Public API",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/medicamenta/api-client-python",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.31.0",
    ],
    keywords="medicamenta medication adherence health api sdk",
    project_urls={
        "Bug Reports": "https://github.com/medicamenta/api-client-python/issues",
        "Documentation": "https://docs.medicamenta.me",
        "Source": "https://github.com/medicamenta/api-client-python",
    },
)

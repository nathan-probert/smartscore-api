local-setup:
	@echo Creating virtual environment
	@poetry shell
	@$(MAKE) install

install:
	@echo Installing dependencies
	@poetry install --sync

lint:
	@echo Linting code
	@poetry run pre-commit run -a

test:
	@echo Running tests
	@poetry run pytest -v

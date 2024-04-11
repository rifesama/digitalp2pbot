.PHONY: DigitalP2PBot-utils commands

help:
	@echo "Usage:"
	@echo "make deploy"
	@echo "make build"

deploy:
	@npm run prebuild
	@npm run build
	@npm run postbuild
	@serverless deploy

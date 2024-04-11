-include .env

.PHONY: DigitalP2PBot Commands

help:
	@echo "Usage:"
	@echo "make deploy"
	@echo "make build"

build:; npm run build

setWebHook:
	@http POST https://api.telegram.org/bot${BOT_TOKEN}/setWebhook url=${DIGITALP2PBOT_API} -v

deleteWebHook:
	@http POST https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook -v

getWebHook:
	@http POST https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo -v

deploy:
	@npm run deploy

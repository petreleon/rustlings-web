.PHONY: setup dev test build preview sync
setup:
	npm ci
	npm run compiler:prepare
dev:
	npm run dev
test:
	npm test
	npm run typecheck
build:
	npm run build
preview:
	npm start
sync:
	npm run exercises:sync

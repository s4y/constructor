.PHONY: pub run deps

deps: \
	static/deps/three/build/three.module.js \
	static/deps/three/examples/jsm/loaders/GLTFLoader.js \

static/deps/three/%:
	mkdir -p "$(dir $@)"
	curl -Lo $@ "https://github.com/mrdoob/three.js/raw/r139/$*"

pub: deps
	go run ./server -http :8080

run: deps
	go run ./server

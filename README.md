# Welcome to your TASAF - SupperApp

Codegen

```shell
npx graphql-codegen --config codegen.ts --watch
```

Biome.js code format and linting

```shell
npx biome check --write .
```

Run android

```shell
npm run android
```

Run ios

```shell
npm run ios
```

Test GraphQL schema

```shell
curl 'http://127.0.0.1:8000/api/graphql' \
  -H 'Content-Type: application/json' \
  --data '{"query":"query { __schema { types { name inputFields { name } } directives { name args { name } } } }"}' \
  > debug_schema.json
```

## Sync

UNINITIALIZED -> SYNCING_REQUIRED_DATA -> VERIFYING_INTEGRITY -> READY

## Directory Structure

```shell
/usr/libexec/java_home
cd /Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
sudo keytool -genkey -v -keystore tasaf-app-upload-key.keystore -alias tasaf-app-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

```shell
npx react-native build-android --mode=release
npm run android -- --mode="release"
```

## Build release version (apk) for android

```shell
cd android && ./gradlew assembleRelease
```

## Install and uninstall apk on android emulator

```shell
adb uninstall com.tasaf.app
adb install app-release.apk
```

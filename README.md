# Doki Doki Dialog Generator

This tools allows you to create scenes that look like they are from the game Doki Doki Literature Club

## Project setup

To get all dependencies of the project, run:

```sh
npm install
```

The repository only contains full quality png images. A proper web build contains png and webp both lossless and lossy compressed. To generate these files, run:

```sh
npm assetConversions
```

This takes a while initialy, but only needs to be repeated when new pngs are added. It also doesn't try to convert files that are already done, so it is faster on subsequent runs.

### Compiles and hot-reloads for development

```
npm run serve
```

### Compiles and minifies for production

```
npm run build:web
```

### Lints and fixes files

```
npm run lint
```

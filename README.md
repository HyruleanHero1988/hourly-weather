# hourly-weather
A color-coded hourly temperature heatmap for the next week

## Hosted deploy

The live app is served at [raygarrison.us/hourly](https://raygarrison.us/hourly/) from the [raygarrison-us-site](https://github.com/HyruleanHero1988/raygarrison-us-site) GitHub Pages workflow.

Pushes to `main` in this repo trigger a redeploy of `raygarrison.us` via `.github/workflows/deploy-raygarrison-site.yml`, which dispatches the site repo's Pages workflow so it reclones the latest `hourly-weather` build.

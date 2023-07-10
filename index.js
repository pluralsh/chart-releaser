const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const semver = require('semver');
const exec = require('@actions/exec');


function prune(tag) {
  return tag.replace('/refs/tags/', '').replace('v', '')
}

const ORDER = ['apiVersion', 'name', 'description', 'appVersion', 'version', 'dependencies', 'maintainers', 'sources']

function weight(key) {
  const ind = ORDER.indexOf(key) 
  if (ind >= 0) return ind
  return ORDER.length
}

async function run() {
  const p = core.getInput('path');
  const chartFile = path.join(p, 'Chart.yaml')
  const chart = yaml.load(fs.readFileSync(chartFile, 'utf8'));
  chart.version = semver.inc(chart.version, 'patch')
  chart.appVersion = prune(core.getInput('release'))
  const dumped = yaml.dump(chart, {
    sortKeys: (a, b) => weight(a) - weight(b)
  })
  fs.writeFile(chartFile, dumped, (err) => {
    if (err) throw err
    core.info('wrote config file')
  })

  const branch = core.getInput('branch')
  if (branch) {
    await setupGit()
    await push(branch, chart.appVersion)
  }
}

async function setupGit() {
  await exec.exec(`git config http.sslVerify false`)
  await exec.exec(`git config user.name "Plural Releaser Bot"`)
  await exec.exec(`git config user.email "<>"`)
}

function gitUrl() {
  return `https://${process.env.GITHUB_ACTOR}:${core.getInput("github-token")}@github.com/${process.env.GITHUB_REPOSITORY}.git`
}

async function push(branch, vsn) {
  await exec.exec(`git add .`)
  await exec.exec(`git commit -m "publishing chart for version ${vsn}"`)
  await exec.exec(`git push ${gitUrl()} HEAD:${branch}`)
}

run();

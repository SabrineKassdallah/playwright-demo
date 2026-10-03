pipeline {
  // Image officielle Playwright : Node + navigateurs déjà installés
  agent { docker { image 'mcr.microsoft.com/playwright:v1.63.0-noble' } }

  parameters {
    choice(name: 'SUITE', choices: ['smoke', 'complete'], description: 'Suite à exécuter')
  }

  triggers { cron('H 2 * * 1-5') }   // régression la nuit

  options {
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    CI = 'true'                       // active les retries définis dans playwright.config.ts
  }

  stages {
    stage('Install') {
      steps { sh 'npm ci' }
    }

    stage('Smoke') {
      when { expression { params.SUITE == 'smoke' } }
      steps { sh 'npx playwright test --grep @smoke --project=chromium' }
    }

    stage('Régression complète') {
      when { expression { params.SUITE == 'complete' } }
      steps { sh 'npx playwright test' }
    }
  }

  post {
    always {
      junit 'results/junit.xml'       // tests en échec → build UNSTABLE (jaune)
      publishHTML(target: [
        reportDir: 'playwright-report', reportFiles: 'index.html',
        reportName: 'Playwright Report', keepAll: true, alwaysLinkToLastBuild: true,
        allowMissing: true
      ])
    }
  }
}

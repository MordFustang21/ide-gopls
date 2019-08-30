const {
  AutoLanguageClient
} = require('atom-languageclient')
const cp = require('child_process')

class GolangLanguageClient extends AutoLanguageClient {
  getGrammarScopes() {
    return ['source.go', 'go']
  }
  getLanguageName() {
    return 'Go'
  }
  getServerName() {
    return 'gopls'
  }

  startServerProcess(projectPath) {
    console.log("Starting gopls server");

    const childProcess = cp.spawn('gopls');

    childProcess.on('close', exitCode => {
      if (!childProcess.killed) {
        atom.notifications.addError('ide-go the gopls language server stopped unexpectedly.', {
          dismissable: true,
          description: this.processStdErr ? `<code>${this.processStdErr}</code>` : `Exit code ${exitCode}`
        })
      }
      console.log(this.processStdErr);
    });

    return childProcess;
  }
}

module.exports = new GolangLanguageClient()
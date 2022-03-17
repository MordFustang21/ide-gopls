const {
    AutoLanguageClient
} = require('atom-languageclient');
const cp = require('child_process');
const PACKAGE_NAME = require('../package.json').name;
const os = require('os');

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

    getRootConfigurationKey() {
        return 'gopls';
    }

    getInitializeParams(projectPath, process) {
        let params = super.getInitializeParams(projectPath, process);

        // let server know we support workspace/configuration calls to load settings
        params.capabilities.workspace.configuration = true;

        return params;
    }

    postInitialization(server) {
        // handle workspace/configuration requests to return specific gopls settings
        server.connection._rpc.onRequest("workspace/configuration", function(params) {
            // load specific gopls settings from config
            let goplsSettings = atom.config.get("gopls");
            return [goplsSettings];
        });
    }

    provideAutocomplete() {
        // Perfer gopls autocompletion results take priority
        const config = atom.config.get(PACKAGE_NAME);
        return Object.assign(super.provideAutocomplete(), {
            suggestionPriority: config.goplsAutocompleteResultsFirst ? 5 : 1
        });
    }

    getSuggestions(request) {
        return super.getSuggestions(request);
    }

    mapConfigurationObject(config) {
        config = super.mapConfigurationObject(config);
        return config;
    }

    onDidInsertSuggestion(args) {
        // apply additional edits for the suggestion
        let buf = args.editor.getBuffer();
        if (args.suggestion.additionalTextEdits) {
            args.suggestion.additionalTextEdits.reverse().forEach(function(item) {
                buf.setTextInRange({
                    start:{row: item.range.start.line, column: item.range.start.character},
                    end:{row: item.range.end.line, column: item.range.end.character}
                }, item.newText)
            });
        }
    }

    onDidConvertAutocomplete(completionItem, suggestion, request) {
        // Add additional edits to suggestion so we can apply them if selected
        suggestion.additionalTextEdits = completionItem.additionalTextEdits;
    }

    startServerProcess(projectPath) {
        // TODO: Check if go/gopls is already installed
        console.log("Starting gopls server");

        let env = process.env;

        // on macOS /usr/local/bin isn't in the systems default PATH so it won't find gopls
        if (os.platform() === 'darwin') {
            env.PATH = env.PATH + ":/usr/local/bin"
        }

        const childProcess = super.spawn('gopls', ['-mode=stdio', 'serve'], {
            env: env,
            cwd: projectPath
        });

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

module.exports.config = {
    goplsAutocompleteResultsFirst: {
        type: 'boolean',
        title: 'Show gopls autocomplete results first',
        description:
            'If checked, gopls suggestions will be placed before the rest of autocomplete results ' +
            '(e.g. snippets etc.). Requires restart to take effect.',
        default: true,
        order: 50,
    },
};

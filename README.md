# 野良digdagクライアント

### 実行環境
- node **v10**
- yarn(nodeについているnpmでも良いがyarnがおすすめ)

### 実行方法

0. リポジトリクローン後、`npm install` または `yarn` で依存ライブラリをダウンロード。  
0. `yarn build` や `npm run build` でtsをコンパイル。
0. `node dist/bundle.js` でコンパイルしたjsを実行。
0. とりあえずEnter押せばヘルプが出るからそれを見ろ。

### Available commands
```
quit                                                   Exit this shell
help                                                   Show this message
version                                                show digdag server version
projects                                               show projects
workflows :projectId                                   show workflows of project
schedules :projectId :workflowName                     show schedules of workflow
sessions :projectId :workflowName                      show sessions of workflow
attempts :sessionId                                    show attempts of session
tasks :attemptId                                       show tasks of attempt
backfillDryRun :scheduleId :fromISODateTime :count     dry run backfill sessions of schedule
backfill :scheduleId :fromISODateTime :count           backfill sessions of schedule
failedSessions                                         show failed sessions
failedLogs :attemptId                                  preview error log
```

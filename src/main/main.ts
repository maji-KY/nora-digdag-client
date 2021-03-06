import ApiHttpClient from "digdag/ApiHttpClient";
import {readConfig} from "digdag/Config";
import {gunzipSync} from "zlib";
import commandLineArgs from "command-line-args";
import shell from "shell";
import * as pad from "pad";

function handleError(e: any, res: any) {
  res.red();
  console.log(e);
  res.prompt();
}

const help = function({"shell": shellInstance}) {
  // Register function
  shellInstance.help = function(req, res, next) {
    res.cyan("Available commands:");
    res.ln();
    const routes = shellInstance.routes;
    routes.forEach(route => {
      const text = pad(route.command, 55);
      if (route.description) {
        res.cyan(text).white(route.description).ln();
      }
    });
    return res.prompt();
  };
  // Register commands
  shellInstance.cmd("help", "Show this message", shellInstance.help.bind(shellInstance));
  shellInstance.cmd("", shellInstance.help.bind(shellInstance));
  // Print introduction message
  return shellInstance.styles.println('Type "help" or press enter for a list of commands');
};

async function main(args: string[]) {

  const optionDefinitions = [
    { "name": "endpoint", "alias": "e", "type": String }
  ];
  const options = commandLineArgs(optionDefinitions);
  const endpoint = options.endpoint ? options.endpoint : (await readConfig())["client.http.endpoint"];
  const client = new ApiHttpClient(endpoint);

  const app = shell({
    "isShell": true
  });

  // configure
  app.configure(() => {
    app.use(shell.completer({
      "shell": app
    }));
    app.use(shell.router({
      "shell": app
    }));
    app.use(shell.error({
      "shell": app
    }));
    app.use(help({
      "shell": app
    }));
  });

  // コマンド定義
  app.cmd("version", "show digdag server version", async (req, res) => {
    try {
      const v = await client.get("/version");
      res.blue();
      console.log(v.body.version);
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("projects", "show projects", async (req, res) => {
    try {
      const v = await client.get("/projects");
      v.body.projects.forEach(({id, name}) => console.log(JSON.stringify({id, name})));
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("workflows :projectId", "show workflows of project", async (req, res) => {
    try {
      const v = await client.get(`/projects/${req.params.projectId}/workflows`);
      v.body.workflows.forEach(({id, name}) => console.log(JSON.stringify({id, name})));
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("schedules :projectId :workflowName", "show schedules of workflow", async (req, res) => {
    try {
      const v = await client.get(`/projects/${req.params.projectId}/schedules`, {"workflow": req.params.workflowName});
      v.body.schedules.forEach(({id, nextRunTime, nextScheduleTime, disabledAt}) => console.log(JSON.stringify({
        id,
        nextRunTime,
        nextScheduleTime,
        disabledAt
      })));
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("sessions :projectId :workflowName", "show sessions of workflow", async (req, res) => {
    try {
      const v = await client.get(`/projects/${req.params.projectId}/sessions`, {"workflow": req.params.workflowName});
      v.body.sessions.forEach(({id, sessionTime, lastAttempt}) => {
        if (lastAttempt.done && !lastAttempt.success) {
          res.red();
        } else if (lastAttempt.done && lastAttempt.success) {
          res.green();
        }
        const {"id": attemptId, retryAttemptName, done, success, createdAt, finishedAt} = lastAttempt;
        console.log(JSON.stringify({
          id,
          sessionTime,
          "lastAttempt": {"id": attemptId, retryAttemptName, done, success, createdAt, finishedAt}
        }));
        res.reset();
      });
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("sessions :projectId :workflowName :lastId", "show sessions of workflow with paging", async (req, res) => {
    try {
      const v = await client.get(`/projects/${req.params.projectId}/sessions`, {"workflow": req.params.workflowName, "last_id": req.params.lastId});
      v.body.sessions.forEach(({id, sessionTime, lastAttempt}) => {
        if (lastAttempt.done && !lastAttempt.success) {
          res.red();
        } else if (lastAttempt.done && lastAttempt.success) {
          res.green();
        }
        const {"id": attemptId, retryAttemptName, done, success, createdAt, finishedAt} = lastAttempt;
        console.log(JSON.stringify({
          id,
          sessionTime,
          "lastAttempt": {"id": attemptId, retryAttemptName, done, success, createdAt, finishedAt}
        }));
        res.reset();
      });
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("attempts :sessionId", "show attempts of session", async (req, res) => {
    try {
      const v = await client.get(`/sessions/${req.params.sessionId}/attempts`, {"include_retried": true});
      v.body.attempts.forEach(({id, index, done, success, createdAt, finishedAt}) => {
        if (done && !success) {
          res.red();
        } else if (done && success) {
          res.green();
        }
        console.log(JSON.stringify({id, index, done, success, createdAt, finishedAt}));
        res.reset();
      });
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("tasks :attemptId", "show tasks of attempt", async (req, res) => {
    try {
      const v = await client.get(`/attempts/${req.params.attemptId}/tasks`);
      v.body.tasks.sort((a, b) => a.id - b.id);
      const taskMap = v.body.tasks.reduce((a, b) => {
        if (b.parentId === null) {
          return a.set("root", [b]);
        }
        const subTasks = a.get(b.parentId) || [];
        return a.set(b.parentId, [...subTasks, b]);
      }, new Map());
      const root = taskMap.get("root") || [];
      const makeTree = function makeTree(task) {
        const children = taskMap.get(task.id);
        if (children) {
          return Array.prototype.concat.apply([task], children.map(makeTree));
        }
        return [task];
      };
      const sorted = root.map(makeTree);
      sorted[0].forEach(({id, fullName, state, startedAt}) => {
        if (state === "error") {
          res.red();
        } else if (state === "group_error") {
          res.magenta();
        } else if (state === "success") {
          res.green();
        } else if (state === "blocked") {
          res.nocolor();
        } else {
          res.cyan();
        }
        console.log(JSON.stringify({id, fullName, state, startedAt}));
        res.reset();
      });
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("backfillDryRun :scheduleId :fromISODateTime :count", "dry run backfill sessions of schedule", async (req, res) => {
    try {
      const v = await client.post(`/schedules/${req.params.scheduleId}/backfill`, {
        "attemptName": new Date().getTime().toString(36),
        "fromTime": req.params.fromISODateTime,
        "count": req.params.count,
        "dryRun": true
      });
      v.body.attempts.forEach(({id, index, sessionTime, project, workflow, sessionId, retryAttemptName}) => {
        console.log(JSON.stringify({id, index, sessionTime, project, workflow, sessionId, retryAttemptName}));
      });
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("backfill :scheduleId :fromISODateTime :count", "backfill sessions of schedule", async (req, res) => {
    try {
      const v = await client.post(`/schedules/${req.params.scheduleId}/backfill`, {
        "attemptName": new Date().getTime().toString(36),
        "fromTime": req.params.fromISODateTime,
        "count": req.params.count,
        "dryRun": false
      });
      v.body.attempts.forEach(({id, index, sessionTime, project, workflow, sessionId, retryAttemptName}) => {
        console.log(JSON.stringify({id, index, sessionTime, project, workflow, sessionId, retryAttemptName}));
      });
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("failedSessions", "show failed sessions", async (req, res) => {
    try {
      const v = await client.get("/sessions", {"page_size": 300});
      res.red();
      v.body.sessions
        .filter(({lastAttempt}) => lastAttempt.done && !lastAttempt.success)
        .forEach(x => console.log(JSON.stringify(x)));
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("failedLogs :attemptId", "preview error log", async (req, res) => {
    try {
      const logs = await client.get(`/logs/${req.params.attemptId}/files`, {"page_size": 300});
      const tasks = await client.get(`/attempts/${req.params.attemptId}/tasks`);
      const failedTaskNames = tasks.body.tasks.filter(({state}) => state === "error").map(({fullName}) => fullName);
      const failedTaksLogFileNames = logs.body.files.filter(({taskName}) => failedTaskNames.includes(taskName)).map(({fileName}) => fileName);
      const failedTaksLogFiles: any[] = await Promise.all(failedTaksLogFileNames.map(fileName => client.getRaw(`/logs/${req.params.attemptId}/files/${fileName}`, {})));
      const errorRegex = /.*(fail|error|exception).*/i;
      failedTaksLogFiles.forEach(log => {
        gunzipSync(log.body).toString("utf-8").split("\n").forEach(line => {
          if (line.match(errorRegex)) {
            res.magenta();
            console.log(line);
            res.reset();
          } else {
            console.log(line);
          }
        });
      });
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("retry :attemptId", "retry session", async (req, res) => {
    try {
      const attemptResult = await client.get(`/attempts/${req.params.attemptId}`);
      const {workflow, sessionTime, params} = attemptResult.body;

      const v = await client.put("/attempts", {
        "workflowId": workflow.id,
        sessionTime,
        params,
        "retryAttemptName": new Date().getTime().toString(36)
      });
      console.log(JSON.stringify(v.body));
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("retry :attemptId :from", "retry session from specified task", async (req, res) => {
    try {
      const attemptResult = await client.get(`/attempts/${req.params.attemptId}`);
      const {workflow, sessionTime, params} = attemptResult.body;

      const v = await client.put("/attempts", {
        "workflowId": workflow.id,
        sessionTime,
        params,
        "resume": {
          "mode": "from",
          "attemptId": req.params.attemptId,
          "from": req.params.from
        },
        "retryAttemptName": new Date().getTime().toString(36)
      });
      console.log(JSON.stringify(v.body));
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("resume :attemptId", "retry session from failed task", async (req, res) => {
    try {
      const attemptResult = await client.get(`/attempts/${req.params.attemptId}`);
      const {workflow, sessionTime, params} = attemptResult.body;

      const v = await client.put("/attempts", {
        "workflowId": workflow.id,
        sessionTime,
        params,
        "resume": {
          "mode": "failed",
          "attemptId": req.params.attemptId
        },
        "retryAttemptName": new Date().getTime().toString(36)
      });
      console.log(JSON.stringify(v.body));
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("skipDryRun :scheduleId :fromISODateTime :count", "dry run skip sessions of schedule", async (req, res) => {
    try {
      const v = await client.post(`/schedules/${req.params.scheduleId}/skip`, {
        "fromTime": req.params.fromISODateTime,
        "count": req.params.count,
        "dryRun": true
      });
      const {id, nextRunTime, nextScheduleTime, disabledAt} = v.body;
      console.log(JSON.stringify({id, nextRunTime, nextScheduleTime, disabledAt}));
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

  app.cmd("skip :scheduleId :fromISODateTime :count", "skip sessions of schedule", async (req, res) => {
    try {
      const v = await client.post(`/schedules/${req.params.scheduleId}/skip`, {
        "fromTime": req.params.fromISODateTime,
        "count": req.params.count,
        "dryRun": false
      });
      const {id, nextRunTime, nextScheduleTime, disabledAt} = v.body;
      console.log(JSON.stringify({id, nextRunTime, nextScheduleTime, disabledAt}));
      res.prompt();
    } catch (e) {
      handleError(e, res);
    }
  });

}

main(process.argv.slice(2)).catch(e => console.error(e));

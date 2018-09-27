import ApiHttpClient from "digdag/ApiHttpClient";
import * as shell from "shell";
import * as pad from "pad";

const client = new ApiHttpClient();

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

  const app = shell();
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

}

main(process.argv.slice(2));

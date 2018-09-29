import {Response} from "request";
import * as rp from "request-promise";
import * as Promise from "bluebird";

const baseUrl = "https://digdag.pyxis-social.com/api";

function request(method: string, endPoint: string, moreOptions = {}): rp.RequestPromise {
  const url = `${baseUrl}${endPoint}`;
  const headers = {};
  return rp({...moreOptions, method, url, headers, "resolveWithFullResponse": true});
}

function parseBody(res: Response): Response {
  if (typeof res.body === "string") {
    res.body = JSON.parse(res.body);
  } else {
    // JSON.parse(JSON.stringify(res.body));
  }
  return res;
}

export default class ApiHttpClient {

  constructor() {
  }

  get(endPoint: string, queryString: any = {}): Promise<Response> {
    return request("GET", endPoint, {"qs": queryString}).then(parseBody);
  }

  post(endPoint: string, body: any = {}): Promise<Response> {
    return request("POST", endPoint, {body, "json": true}).then(parseBody);
  }

  getRaw(endPoint: string, queryString: any = {}): rp.RequestPromise {
    return request("GET", endPoint, {"qs": queryString, "encoding": null});
  }

}

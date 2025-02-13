/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CachedContent, RequestOptions } from "../../types";
import { CachedContentUrl, getHeaders, makeServerRequest } from "./request";
import {
  CachedContentCreateParams,
  CachedContentUpdateParams,
  ListCacheResponse,
  ListParams,
  _CachedContentUpdateRequestFields,
} from "../../types/server";
import { RpcTask } from "./constants";
import {
  GoogleGenerativeAIError,
  GoogleGenerativeAIRequestInputError,
} from "../errors";
import { formatSystemInstruction } from "../requests/request-helpers";

/**
 * Manages GoogleAI content caches.
 */
export class GoogleAICacheManager {
  constructor(public apiKey: string, private _requestOptions?: RequestOptions) {}

  /**
   * Uploads a new content cache.
   */
  async create(createOptions: CachedContentCreateParams): Promise<CachedContent> {
    const newCachedContent = { ...createOptions };

    if (createOptions.ttlSeconds) {
      if (createOptions.expireTime) {
        throw new GoogleGenerativeAIRequestInputError(
          "Cannot specify both `ttlSeconds` and `expireTime`. Choose one."
        );
      }
      newCachedContent.ttl = `${createOptions.ttlSeconds}s`;
      delete newCachedContent.ttlSeconds;
    }

    if (!newCachedContent.model) {
      throw new GoogleGenerativeAIRequestInputError("Cached content requires a `model` field.");
    }
    
    if (!newCachedContent.model.includes("/")) {
      newCachedContent.model = `models/${newCachedContent.model}`;
    }

    const response = await makeServerRequest(
      new CachedContentUrl(RpcTask.CREATE, this.apiKey, this._requestOptions),
      getHeaders(new CachedContentUrl(RpcTask.CREATE, this.apiKey, this._requestOptions)),
      JSON.stringify(newCachedContent)
    );
    return response.json();
  }

  /**
   * Lists all uploaded content caches.
   */
  async list(listParams?: ListParams): Promise<ListCacheResponse> {
    const url = new CachedContentUrl(RpcTask.LIST, this.apiKey, this._requestOptions);
    if (listParams?.pageSize) url.appendParam("pageSize", listParams.pageSize.toString());
    if (listParams?.pageToken) url.appendParam("pageToken", listParams.pageToken);
    
    return (await makeServerRequest(url, getHeaders(url))).json();
  }

  /**
   * Retrieves a content cache by name.
   */
  async get(name: string): Promise<CachedContent> {
    const url = new CachedContentUrl(RpcTask.GET, this.apiKey, this._requestOptions);
    url.appendPath(parseCacheName(name));
    return (await makeServerRequest(url, getHeaders(url))).json();
  }

  /**
   * Updates an existing content cache.
   */
  async update(name: string, updateParams: CachedContentUpdateParams): Promise<CachedContent> {
    const url = new CachedContentUrl(RpcTask.UPDATE, this.apiKey, this._requestOptions);
    url.appendPath(parseCacheName(name));
    
    const formattedCachedContent: _CachedContentUpdateRequestFields = { ...updateParams.cachedContent };
    if (updateParams.cachedContent.ttlSeconds) {
      formattedCachedContent.ttl = `${updateParams.cachedContent.ttlSeconds}s`;
      delete formattedCachedContent.ttlSeconds;
    }
    if (updateParams.updateMask) {
      url.appendParam("update_mask", updateParams.updateMask.map(camelToSnake).join(","));
    }

    return (await makeServerRequest(url, getHeaders(url), JSON.stringify(formattedCachedContent))).json();
  }

  /**
   * Deletes a content cache by name.
   */
  async delete(name: string): Promise<void> {
    const url = new CachedContentUrl(RpcTask.DELETE, this.apiKey, this._requestOptions);
    url.appendPath(parseCacheName(name));
    await makeServerRequest(url, getHeaders(url));
  }
}

/**
 * Parses and validates the cache name.
 */
function parseCacheName(name: string): string {
  if (!name) {
    throw new GoogleGenerativeAIError("Invalid cache name. Must be 'cachedContents/name' or 'name'.");
  }
  return name.startsWith("cachedContents/") ? name.split("cachedContents/")[1] : name;
}

/**
 * Converts camelCase to snake_case.
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Copyright © 2021 Alibaba Group Holding Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

use anyhow::Error;
use serde::Deserialize;
use yew::{ComponentLink, callback::Callback, format::Nothing, services::fetch::{FetchTask, Request}};

pub struct Image {
    pub name: String,
    pub body: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct RegistryCatalog {
    pub repositories: Vec<String>,
}

pub struct Images {
    // props: Props,
    pub repos: Option<Vec<String>>,
    pub error: Option<String>,
    pub link: ComponentLink<Self>,
    pub task: Option<FetchTask>
}

pub fn get_image_list(callback: Callback<Result<String, Error>>) {
    let images_list = Request::get("https://localhost:5000/v2/_catalog")
        .body(Nothing)
        .expect("Could not build that request");
}

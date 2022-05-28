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

pub mod components;
pub mod routes;
pub mod services;

use yew::prelude::*;
use yew_router::prelude::*;
use crate::components::{header::Header, image_info::ImageDetail};
use crate::routes::{router::AppRoute};
use crate::services::{requests::Images};

enum Msg {
}

struct Model {
    // `ComponentLink` is like a reference to a component.
    // It can be used to send messages to the component
    link: ComponentLink<Self>,
    value: i64,
}

impl Component for Model {
    type Message = Msg;
    type Properties = ();

    fn create(_props: Self::Properties, link: ComponentLink<Self>) -> Self {
        Self {
            link,
            value: 0,
        }
    }

    fn update(&mut self, msg: Self::Message) -> ShouldRender {
        true
    }

    fn change(&mut self, _props: Self::Properties) -> ShouldRender {
        false
    }

    fn view(&self) -> Html {
        html! {
            <div>
              <Header />
              <Router<AppRoute> render = Router::render(Self::switch) />
            </div>
        }
    }
}

impl Model {
   fn switch(route: AppRoute) -> Html {
        match route {
            AppRoute::Images => html! { <Images /> },
            AppRoute::ImageDetail(name)=> html! { <ImageDetail image_name=name /> }
        }
    }
}

fn main() {
    yew::start_app::<Model>();
}
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


use yew::{html, Component,ComponentLink,Html,ShouldRender,Properties};

pub struct ImageDetail{
   props: Props,
}

#[derive(Properties, Clone)]
pub struct Props {
    pub image_name: String,
}

pub enum Msg {}

impl Component for ImageDetail{
    type Message = Msg;
    type Properties = Props;
    
    fn create(props: Self::Properties, _: ComponentLink<Self>) -> Self {
        ImageDetail{
            props,
        }
    }
    
    fn update(&mut self, _msg: Self::Message) -> ShouldRender {
        true
    }
    
    fn change(&mut self, props: Self::Properties) -> ShouldRender {
        true
    }
    
    fn view(&self) -> Html {
        html! {
            <div>
            { "this is image info" }
            { self.props.image_name.to_string() }
            </div>
        }
    }
}

impl ImageDetail{
   fn detail(&self) -> Html {
       html! {
           <div class="navbar-brand">
           </div>
       }
   }
}
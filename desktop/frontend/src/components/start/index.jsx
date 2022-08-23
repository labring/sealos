import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as Actions from "../../actions";
import { getTreeValue } from "../../actions";
import { Icon } from "../../utils/general";
import Battery from "../shared/Battery";
import "./searchpane.scss";
import "./sidepane.scss";
import "./startmenu.scss";

export * from "./start";
export * from "./widget";

export const DesktopApp = () => {
	const deskApps = useSelector((state) => {
		var arr = { ...state.desktop };
		var tmpApps = [...arr.apps];

		if (arr.sort == "name") {
			tmpApps.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));
		} else if (arr.sort == "size") {
			tmpApps.sort((a, b) => {
				var anm = a.name,
					bnm = b.name;

				return anm[bnm.charCodeAt(0) % anm.length] >
					bnm[anm.charCodeAt(0) % bnm.length]
					? 1
					: -1;
			});
		} else if (arr.sort == "date") {
			tmpApps.sort((a, b) => {
				var anm = a.name,
					bnm = b.name;
				var anml = anm.length,
					bnml = bnm.length;

				return anm[(bnml * 13) % anm.length] > bnm[(anml * 17) % bnm.length]
					? 1
					: -1;
			});
		}

		arr.apps = tmpApps;
		return arr;
	});
	const dispatch = useDispatch();

	return (
		<div className="desktopCont">
			{!deskApps.hide &&
				deskApps.apps.map((app, i) => {
					return (
						// to allow it to be focusable (:focus)
						<div key={i} className="dskApp" tabIndex={0}>
							<Icon
								click={app.action}
								className="dskIcon prtclk"
								src={app.icon}
								payload={app.payload || "full"}
								pr
								width={Math.round(deskApps.size * 36)}
								menu="app"
							/>
							<div className="appName">{app.name}</div>
						</div>
					);
				})}
		</div>
	);
};

export const BandPane = () => {
	const sidepane = useSelector((state) => state.sidepane);

	return (
		<div
			className="bandpane dpShad"
			data-hide={sidepane.banhide}
			style={{ "--prefix": "BAND" }}
		>
			<div className="bandContainer">
				<Icon className="hvlight" src="defender" width={17} />
				<Icon className="hvlight" src="spotify" width={17} />
				<Icon className="hvlight" src="teams" width={17} />
			</div>
		</div>
	);
};

export const SidePane = () => {
	const sidepane = useSelector((state) => state.sidepane);
	const setting = useSelector((state) => state.setting);
	const tasks = useSelector((state) => state.taskbar);
	const [pnstates, setPnstate] = useState([]);
	const dispatch = useDispatch();

	let [btlevel, setBtLevel] = useState("");
	const childToParent = () => {};

	const clickDispatch = (event) => {
		var action = {
			type: event.target.dataset.action,
			payload: event.target.dataset.payload,
		};

		if (action.type) {
			if (action.type != action.type.toUpperCase()) {
				Actions[action.type](action.payload);
			} else dispatch(action);
		}
	};

	const vSlider = document.querySelector(".vSlider");
	const bSlider = document.querySelector(".bSlider");

	const setVolume = (e) => {
		var aud = 3;
		if (e.target.value < 70) aud = 2;
		if (e.target.value < 30) aud = 1;
		if (e.target.value == 0) aud = 0;

		dispatch({ type: "TASKAUDO", payload: aud });

		silderBackground(vSlider, e.target.value);
	};

	function silderBackground(elem, e) {
		elem.style.setProperty(
			"--track-color",
			`linear-gradient(90deg, var(--clrPrm) ${e - 3}%, #888888 ${e}%)`
		);
	}

	const setBrightness = (e) => {
		var brgt = e.target.value;
		document.getElementById("brightoverlay").style.opacity = (100 - brgt) / 100;
		dispatch({
			type: "STNGSETV",
			payload: {
				path: "system.display.brightness",
				value: brgt,
			},
		});
		silderBackground(bSlider, brgt);
	};

	useEffect(() => {
		sidepane.quicks.map((item, i) => {
			if (item.src == "nightlight") {
				if (pnstates[i]) document.body.dataset.sepia = true;
				else document.body.dataset.sepia = false;
			}
		});
	});

	useEffect(() => {
		// console.log("ok")
		var tmp = [];
		for (var i = 0; i < sidepane.quicks.length; i++) {
			var val = getTreeValue(setting, sidepane.quicks[i].state);
			if (sidepane.quicks[i].name == "Theme") val = val == "dark";
			tmp.push(val);
		}

		setPnstate(tmp);
	}, [setting, sidepane]);

	return (
		<div
			className="sidePane dpShad"
			data-hide={sidepane.hide}
			style={{ "--prefix": "PANE" }}
		>
			<div className="quickSettings p-5 pb-8">
				<div className="qkCont">
					{sidepane.quicks.map((qk, idx) => {
						return (
							<div key={idx} className="qkGrp">
								<div
									className="qkbtn handcr prtclk"
									onClick={clickDispatch}
									data-action={qk.action}
									data-payload={qk.payload || qk.state}
									data-state={pnstates[idx]}
								>
									<Icon
										className="quickIcon"
										ui={qk.ui}
										src={qk.src}
										width={14}
										invert={pnstates[idx] ? true : null}
									/>
								</div>
								<div className="qktext">{qk.name}</div>
							</div>
						);
					})}
				</div>
				<div className="sliderCont">
					<Icon className="mx-2" src="brightness" ui width={20} />
					<input
						className="sliders bSlider"
						onChange={setBrightness}
						type="range"
						min="10"
						max="100"
						defaultValue="100"
					/>
				</div>
				<div className="sliderCont">
					<Icon className="mx-2" src={"audio" + tasks.audio} ui width={18} />
					<input
						className="sliders vSlider"
						onChange={setVolume}
						type="range"
						min="0"
						max="100"
						defaultValue="100"
					/>
				</div>
			</div>
			<div className="p-1 bottomBar">
				<div className="px-3 bettery">
					<Battery pct />
				</div>
			</div>
		</div>
	);
};

export const CalnWid = () => {
	const sidepane = useSelector((state) => state.sidepane);
	const [loaded, setLoad] = useState(false);

	const [collapse, setCollapse] = useState("");

	const collapseToggler = () => {
		collapse === "" ? setCollapse("collapse") : setCollapse("");
	};

	useEffect(() => {
		if (!loaded) {
			setLoad(true);
			window.dycalendar.draw({
				target: "#dycalendar",
				type: "month",
				dayformat: "ddd",
				monthformat: "full",
				prevnextbutton: "show",
				highlighttoday: true,
			});
		}
	});

	return (
		<div
			className={`calnpane ${collapse} dpShad`}
			data-hide={sidepane.calhide}
			style={{ "--prefix": "CALN" }}
		>
			<div className="topBar pl-4 text-sm">
				<div className="date">
					{new Date().toLocaleDateString(undefined, {
						weekday: "long",
						month: "long",
						day: "numeric",
					})}
				</div>
				<div className="collapser p-2 m-4 rounded" onClick={collapseToggler}>
					{collapse === "" ? (
						<Icon fafa="faChevronDown" />
					) : (
						<Icon fafa="faChevronUp" />
					)}
				</div>
			</div>
			<div id="dycalendar"></div>
		</div>
	);
};

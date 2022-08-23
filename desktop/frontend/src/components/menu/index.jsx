import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Icon } from "../../utils/general";
import "./menu.scss";

import * as Actions from "../../actions";

export const ActMenu = () => {
	const menu = useSelector((state) => state.menus);
	const menudata = menu.data[menu.opts];
	const { abpos, isLeft } = useSelector((state) => {
		var acount = state.menus.menus[state.menus.opts].length;
		var tmpos = {
				top: state.menus.top,
				left: state.menus.left,
			},
			tmpleft = false;

		var wnwidth = window.innerWidth,
			wnheight = window.innerHeight;

		var ewidth = 312,
			eheight = acount * 28;

		tmpleft = wnwidth - tmpos.left > 504;
		if (wnwidth - tmpos.left < ewidth) {
			tmpos.left = wnwidth - ewidth;
		}

		if (wnheight - tmpos.top < eheight) {
			tmpos.bottom = wnheight - tmpos.top;
			tmpos.top = null;
		}

		return {
			abpos: tmpos,
			isLeft: tmpleft,
		};
	});

	const dispatch = useDispatch();

	const clickDispatch = (event) => {
		event.stopPropagation();
		var action = {
			type: event.target.dataset.action,
			payload: event.target.dataset.payload,
		};

		if (action.type) {
			if (action.type != action.type.toUpperCase()) {
				Actions[action.type](action.payload, menu);
			} else {
				dispatch(action);
			}
			dispatch({ type: "MENUHIDE" });
		}
	};

	const menuobj = (data) => {
		var mnode = [];
		data.map((opt, i) => {
			if (opt.type == "hr") {
				mnode.push(<div key={i} className="menuhr"></div>);
			} else {
				mnode.push(
					<div
						key={i}
						className="menuopt"
						data-dsb={opt.dsb}
						onClick={clickDispatch}
						data-action={opt.action}
						data-payload={opt.payload}
					>
						{menudata.ispace != false ? (
							<div className="spcont">
								{opt.icon && opt.type == "svg" ? (
									<Icon icon={opt.icon} width={16} />
								) : null}
								{opt.icon && opt.type == "fa" ? (
									<Icon fafa={opt.icon} width={16} />
								) : null}
								{opt.icon && opt.type == null ? (
									<Icon src={opt.icon} width={16} />
								) : null}
							</div>
						) : null}
						<div className="nopt">{opt.name}</div>
						{opt.opts ? (
							<Icon
								className="micon rightIcon"
								fafa="faChevronRight"
								width={10}
								color="#999"
							/>
						) : null}
						{opt.dot ? (
							<Icon
								className="micon dotIcon"
								fafa="faCircle"
								width={4}
								height={4}
							/>
						) : null}
						{opt.check ? (
							<Icon
								className="micon checkIcon"
								fafa="faCheck"
								width={8}
								height={8}
							/>
						) : null}
						{opt.opts ? (
							<div
								className="minimenu"
								style={{
									minWidth: menudata.secwid,
								}}
							>
								{menuobj(opt.opts)}
							</div>
						) : null}
					</div>
				);
			}
		});

		return mnode;
	};

	return (
		<div
			className="actmenu"
			id="actmenu"
			style={{
				...abpos,
				"--prefix": "MENU",
				width: menudata.width,
			}}
			data-hide={menu.hide}
			data-left={isLeft}
		>
			{menuobj(menu.menus[menu.opts])}
		</div>
	);
};

export default ActMenu;

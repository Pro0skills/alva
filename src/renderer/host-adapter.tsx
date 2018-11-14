import * as Types from '../types';
import * as M from '../message';
import * as Store from '../store';
import * as ContextMenu from '../context-menu';
import * as MobxReact from 'mobx-react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Menu from '../container/menu';

export class HostAdapter {
	private sender: Types.Sender;
	private store: Store.ViewStore;
	private host: BrowserHost;

	private constructor(init: { sender: Types.Sender; store: Store.ViewStore }) {
		this.sender = init.sender;
		this.store = init.store;

		this.host = new BrowserHost({
			store: this.store
		});
	}

	public static fromStore(store: Store.ViewStore): HostAdapter {
		return new HostAdapter({ sender: store.getSender(), store });
	}

	public start() {
		this.host.start();
		this.sender.match(M.MessageType.OpenExternalURL, m => this.host.open(m.payload));
		this.sender.match(M.MessageType.ShowMessage, m => this.host.showMessage(m.payload));

		this.sender.match(M.MessageType.ContextMenuRequest, m => {
			if (m.payload.menu === Types.ContextMenuType.ElementMenu) {
				const element = this.store.getProject().getElementById(m.payload.data.element.id);

				if (!element) {
					return;
				}

				this.host.showContextMenu({
					position: m.payload.position,
					items: ContextMenu.elementContextMenu({
						app: this.store.getApp(),
						project: this.store.getProject(),
						element
					})
				});
			}
		});
	}
}

export class BrowserHost implements Partial<Types.Host> {
	private container: HTMLElement;
	private menuStore: Store.MenuStore;
	private store: Store.ViewStore;

	constructor(init: { store: Store.ViewStore }) {
		this.container = document.createElement('div');
		this.container.style.position = 'fixed';
		this.container.style.top = '100vh';
		this.container.style.zIndex = '97';

		this.menuStore = new Store.MenuStore([]);
		this.store = init.store;
	}

	public start() {
		document.body.appendChild(this.container);

		ReactDOM.render(
			<MobxReact.Provider store={this.store} menuStore={this.menuStore}>
				<Menu.ContextMenu />
			</MobxReact.Provider>,
			this.container
		);
	}

	public async open(url: string): Promise<void> {
		window.open(url, '_blank');
	}

	public async showMessage(opts: Types.HostMessageOptions): Promise<undefined> {
		// TODO: implement custom dialogs
		alert([opts.message, opts.detail].filter(Boolean).join('\n'));
		return;
	}

	public async showContextMenu(opts: {
		items: Types.ContextMenuItem[];
		position: { x: 0; y: 0 };
	}): Promise<undefined> {
		opts.items.forEach(item => this.menuStore.add(item, { depth: 0, active: false }));
		this.menuStore.position = opts.position;
		return;
	}
}
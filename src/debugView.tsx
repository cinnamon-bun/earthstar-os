import * as React from 'react';
import {
    Document,
    Emitter,
    Pub,
    subscribeToMany,
} from 'earthstar'
import throttle = require('lodash.throttle');

import { Thunk } from './types';
import {
    randomColor,
} from './util';
import { EarthstarRouter } from './router';
import { RainbowBug } from './rainbowBug';

let logDebug = (...args : any[]) => console.log('DebugView |', ...args);
let logDebugEmitter = (...args : any[]) => console.log('DebugEmitterView |', ...args);

//================================================================================

interface DebugEmitterViewProps {
    name : string;
    emitter : Emitter<any>;
}
export class DebugEmitterView extends React.Component<DebugEmitterViewProps, any> {
    unsub : Thunk | null = null;
    colors : string[] = ['white', 'white', 'white', 'white', 'white', 'white', 'white'];
    componentDidMount() {
        logDebugEmitter('subscribing to router changes for ' + this.props.name);
        this.unsub = this.props.emitter.subscribe(() => {
            logDebugEmitter('rendering because of an event: ' + this.props.name);
            this.colors.unshift(randomColor());
            this.colors.pop();
            this.forceUpdate();
        });
    }
    componentWillUnmount() {
        if (this.unsub) { this.unsub(); }
    }
    render() {
        return <RainbowBug name={this.props.name} />;
    }
}

let sPage : React.CSSProperties = {
    padding: 15,
}
interface DebugViewProps {
    router : EarthstarRouter;
}
export class DebugView extends React.Component<DebugViewProps, any> {
    unsub : Thunk | null = null;
    componentDidMount() {
        logDebug('subscribing to router changes');
        let router = this.props.router;
        this.unsub = subscribeToMany<any>(
            [
                router.onParamsChange,
                router.onWorkspaceChange,
                router.onStorageChange,
                router.onSyncerChange
            ],
            throttle(() => this.forceUpdate(), 200)
        );
    }
    componentWillUnmount() {
        if (this.unsub) { this.unsub(); }
    }
    render() {
        logDebug('render');
        let router = this.props.router;
        let workspace = router.workspace;
        let docs : Document[] = workspace === null ? [] : workspace.storage.documents({ includeHistory: false });
        let pubs : Pub[] = workspace === null ? [] : workspace.syncer.state.pubs;
        return <div style={sPage}>
            <div><RainbowBug name="DebugView"/></div>
            <h3>params</h3>
            <pre>{JSON.stringify(router.params, null, 4)}</pre>
            <h3>workspace</h3>
            <code>{router.workspaceAddress || 'null'}</code>
            <h3>author</h3>
            <pre>{JSON.stringify(router.authorKeypair, null, 4)}</pre>
            <h3>workspace</h3>
            {workspace === null
              ? <div>(no workspace)</div>
              : <div>
                    <pre>workspace address: {workspace.address}</pre>
                    <pre>author address: {workspace.authorKeypair?.address || '(no author)'}</pre>
                </div>
            }
            <h3>workspace.pubs</h3>
            {pubs.length === 0
              ? <div>(no pubs)</div>
              : pubs.map(pub =>
                    <pre key={pub.domain}>{JSON.stringify(pub, null, 4)}</pre>
                )
            }
            <h3>workspace.docs</h3>
            {docs.length === 0
              ? <div>(no docs)</div>
              : docs.map(doc =>
                    <div key={doc.path + '^' + doc.author}>
                        <div><b><code>{doc.path}</code></b></div>
                        <div><pre>{doc.value}</pre></div>
                    </div>
                )
            }
        </div>;
    }
}


import * as React from 'react';
import {
    Document,
    Pub,
    AuthorProfile,
} from 'earthstar'
import throttle = require('lodash.throttle');
import deepEqual = require('fast-deep-equal');

import { Thunk } from './types';
import {
    randomColor,
} from './util';
import { EarthstarRouter } from './router';
import { AppProps } from './appSwitcher';
import { Emitter, subscribeToMany } from './emitter';
import { RainbowBug } from './rainbowBug';

let logProfileApp = (...args : any[]) => console.log('ProfileApp |', ...args);

//================================================================================

let cEggplant = '#5e4d76';
let cWhite = '#fff';
let cBlack = '#222';
let cFaintOpacity = 0.65;

let cBarText = cBlack;
let cBarBackground = cWhite;
let cBarBorder = cEggplant;
let cButtonBackground = cEggplant;
let cButtonText = cWhite;

let sPage : React.CSSProperties = {
    margin: 40,
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#e4e4e4',
    position: 'relative',
}
let sButton : React.CSSProperties = {
    //padding: 10,
    height: '2em',
    //marginLeft: 15,
    borderRadius: 10,
    background: cButtonBackground,
    color: cButtonText,
    border: 'none',
    fontSize: 'inherit',
}

interface ProfileAppState {
    editMode : boolean;
    editedProfile : AuthorProfile;
}
export class ProfileApp extends React.Component<AppProps, ProfileAppState> {
    unsub : Thunk | null = null;
    constructor(props : AppProps) {
        super(props);
        this.state = {
            editMode: false,
            editedProfile: {},
        }
    }
    componentDidMount() {
        logProfileApp('subscribing to router changes');
        let router = this.props.router;
        this.unsub = subscribeToMany<any>(
            [
                router.onParamsChange,  // expects an optional "author" param, which can be "me"
                router.onWorkspaceChange,
                router.onStorageChange,
            ],
            throttle(() => {
                logProfileApp('throttled event handler is running, about to render.');
                this.forceUpdate()
            }, 200)
        );
    }
    componentWillUnmount() {
        logProfileApp('unsubscribing to router changes');
        if (this.unsub) { this.unsub(); }
    }
    _startEditing(profile : AuthorProfile) {
        this.setState({
            editMode: true,
            editedProfile: {...profile},
        });
    }
    _saveEdits(oldProfile : AuthorProfile) {
        logProfileApp('_saveEdits: begin');
        if (deepEqual(this.state.editedProfile, oldProfile)) {
            logProfileApp('_saveEdits: ...nothing was changed.  cancelling.');
            this._clearEdits();
            logProfileApp('_saveEdits: ...done');
            return;
        }
        let workspace = this.props.router.workspace;
        let keypair = this.props.router.authorKeypair;
        let profile = this.state.editedProfile;
        if (!profile.longname) { delete profile.longname; }
        if (!profile.hue) { delete profile.hue; }
        if (!profile.bio) { delete profile.bio; }
        if (workspace && keypair) {
            logProfileApp('_saveEdits: ...saving to workspace storage');
            workspace.layerAbout.setMyAuthorProfile(keypair, profile);
        }
        logProfileApp('_saveEdits: ...setting react state');
        this._clearEdits();
        logProfileApp('_saveEdits: ...done');
    }
    _clearEdits() {
        this.setState({
            editMode: false,
            editedProfile: {},
        });
    }
    render() {
        logProfileApp('render');
        let router = this.props.router;
        if (router.workspace === null) {
            return <div style={sPage}>
                <RainbowBug position='topRight' />
                Choose a workspace
            </div>;
        }
        let layerAbout = router.workspace.layerAbout;

        let subject = router.params.author;
        let isMe = false;
        if (router.authorKeypair !== null) {
            let myAddress = router.authorKeypair.address;
            if (!subject || subject === "me") {
                subject = myAddress;
            }
            isMe = subject === myAddress;
        }

        if (!subject) {
            return <div style={sPage}>
                <RainbowBug position='topRight' />
                Choose an author
            </div>;
        }

        let infoOrNull = layerAbout.getAuthorInfo(subject);
        if (infoOrNull === null) {
            return <div style={sPage}>
                <RainbowBug position='topRight' />
                Unparsable author name: <code>{JSON.stringify(subject)}</code>
            </div>;
        }
        let editMode = this.state.editMode;
        let info = infoOrNull;
        let hue = typeof info.profile.hue === 'number' ? info.profile.hue : null;
        let color = (hue === null) ? '#aaa' : `hsl(${hue}, 50%, 50%)`;

        // TODO: make sure subject is in this list
        let allAuthorInfos = layerAbout.listAuthorInfos();
        logProfileApp(allAuthorInfos);

//                    <select name="ws" style={sSelect}
//                        value={router.workspaceAddress || 'null'}
//                        onChange={(e) => router.setWorkspace(e.target.value == 'null' ? null : e.target.value)}

        return <div style={sPage}>
            <RainbowBug position='topRight' />

            {/* author switcher dropdown */}
            {allAuthorInfos.length === 0
              ? null
              : <p>
                    <select value={subject}
                        onChange={(e) => {
                            logProfileApp('change author hash param to:', e.target.value);
                            router.setParams({...router.params, author: e.target.value});
                        }}
                        >
                        {allAuthorInfos.map(authorInfo =>
                            <option key={authorInfo.address} value={authorInfo.address}>
                                @{authorInfo.shortname}.{authorInfo.pubkey.slice(0, 10)}...{authorInfo.profile.longname ? ' -- ' + authorInfo.profile.longname : null}
                            </option>
                        )}
                    </select>
                </p>
            }

            {/* profile pic */}
            <p>
                <span style={{
                    display: 'inline-block',
                    width: 100,
                    height: 100,
                    borderRadius: 100,
                    backgroundColor: color,
                }}/>
            </p>

            {/* edit buttons */}
            {isMe ? <p>
                <i>This is you. </i>
                {editMode
                ? <button style={sButton} onClick={() => this._saveEdits(info.profile)}>
                    Save
                </button>
                : <button style={sButton} onClick={() => this._startEditing(info.profile)}>
                    Edit
                </button>
                }
            </p> : null}

            {/* shortname and longname */}
            <p><code><b style={{fontSize: '1.25em'}}>@{info.shortname}</b><i>.{info.pubkey}</i></code></p>
            <p style={{fontSize: '1.25em'}}>{
                editMode
                ? <input type="text"
                        style={{width: '50%', padding: 5, fontWeight: 'bold'}}
                        placeholder="(none)"
                        value={this.state.editedProfile.longname || ''}
                        onChange={(e: any) => this.setState({editedProfile: {...this.state.editedProfile, longname: e.target.value}})}
                        />
                : <b>{info.profile.longname || '(no longname set)'}</b>
                }
            </p>
            {/* json view */}
            <hr />
            <pre>{JSON.stringify(info, null, 4)}</pre>
        </div>;
    }
}
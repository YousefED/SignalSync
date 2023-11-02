import { next as am } from '@automerge/automerge';
import type { DocHandlePatchPayload } from '@automerge/automerge-repo';
import {
  PatchSemaphore,
  plugin as amgPlugin,
  init as initPm,
} from '@automerge/prosemirror';
import b64 from 'base64-js';
import { exampleSetup } from 'prosemirror-example-setup';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
// import 'prosemirror-view/style/prosemirror.css';
import * as React from 'react';

import { useProxySelector } from '../../hooks/useProxySelector';
import { StateType } from '../../state/reducer';

// export class SignalNetworkAdapter extends NetworkAdapter {
//   private seenMessages = new Set<string>();

//   constructor(private sendMessage: (message: any) => void) {
//     super();

//     // this.emit('peer-candidate', { peerId: '1' });
//   }

//   override connect(url?: string | undefined): void {
//     console.log('CONNECT');
//     // throw new Error('Method not implemented.');
//     this.emit('ready', { network: this });
//     this.emit('peer-candidate', { peerId: '1' });
//   }

//   public receiveMessage(id: any, message: any) {
//     if (this.seenMessages.has(id)) {
//       return;
//     }
//     this.seenMessages.add(id);
//     if (!message?.body) {
//       console.error('no message body');
//       debugger;
//       return;
//     }
//     if (!message.body.startsWith('$$')) {
//       return;
//     }

//     this.emit('message', {
//       broadcast: true,
//       // channelId: '1',
//       message: b64.toByteArray(message.body.substr(2)),
//       senderId: this.peerId!,
//       targetId: undefined as any,
//       channelId: undefined as any,
//     });
//   }

//   override send(message: RepoMessage): void {
//     console.log('SEND MESSAGE', message);
//     // const msg = b64.fromByteArray(message);
//     // this.send('$$' + msg);
//   }

//   override disconnect(): void {
//     // throw new Error('Method not implemented.');
//   }
// }

class AutomergeBridge {
  private seenMessages = new Set<string>();

  public doc: am.Doc<any>;

  public onPatch: (p: DocHandlePatchPayload<any>) => void = () => {};

  constructor(send: (message: any) => void) {
    this.doc = am.init<any>({
      patchCallback: (patches, info) => {
        // onPatch()
        // debugger;
        if (info.source !== 'applyChanges') {
          // local change
          const update = am.getChanges(info.before, info.after);
          const msg = update.map(u => b64.fromByteArray(u)).join('$$');
          send('$$' + msg);
        } else {
          // remote change
          this.onPatch({
            after: info.after,
            patches,
          });
        }
      },
    });

    this.doc = am.change(this.doc, doc => {
      // debugger;
      // @ts-ignore
      if (!doc.text) {
        // debugger;
        // @ts-ignore
        doc.text = '';
      }
    });
  }

  public addMessage(id, message: any) {
    // debugger;
    if (this.seenMessages.has(id)) {
      return;
    }
    this.seenMessages.add(id);
    if (!message.body.startsWith('$$')) {
      return;
    }
    const changes: Array<Uint8Array> = message.body
      .substr(2)
      .split('$$')
      .map(b64.toByteArray);
    const result = am.applyChanges(this.doc, changes)[0];
    this.doc = result;
    debugger;
  }
}

const path = ['text'];

export function DocViewInner(props: {
  messages: string[];
  addMessage: (msg: any) => void;
}) {
  const parent = React.useRef(document.createElement('div'));
  const view = React.useRef<EditorView | null>(null);
  // const manager = React.useMemo(() => {
  //   const networkProvider = new SignalNetworkAdapter(props.addMessage);
  //   const repo = new Repo({
  //     network: [networkProvider],
  //     sharePolicy: async () => true,
  //   });

  //   return {
  //     networkProvider,
  //     repo,
  //   };
  // }, []);

  const manager = React.useMemo(
    () => new AutomergeBridge(props.addMessage),
    []
  );

  const lookup = useProxySelector((state: StateType) => {
    return state.conversations.messagesLookup;
  });

  React.useEffect(() => {
    props.messages.forEach(m => {
      manager.addMessage(m, lookup[m]);
    });
  }, [manager, props.messages, lookup]);

  // const messages = props.messages.map(id => lookup[id].body);
  // return <div />;
  // return
  // const editor = useBlockNote({});

  // Renders the editor instance using a React component.
  // React.useEffect(async () => {
  //   // const lib = await import('@blocknote/react');
  //   console.log('HELLO', useBlockNote);
  // }, []);

  React.useEffect(() => {
    // const handle = manager.repo.create();
    // handle.change(doc => {
    //   // @ts-ignore
    //   if (!doc.text) {
    //     // debugger;
    //     // @ts-ignore
    //     doc.text = '';
    //   }
    // });

    // let amdoc = am.init<any>({
    //   patchCallback: (patches, info) => {
    //     // onPatch()
    //     // debugger;
    //     const update = am.getChanges(info.before, info.after);
    //     const msg = update.map(u => b64.fromByteArray(u)).join('$$');
    //     props.addMessage('$$' + msg);
    //   },
    // });

    // const handle = {
    //   amdoc,
    // };

    // handle.amdoc = am.change(amdoc, doc => {
    //   debugger;
    //   // @ts-ignore
    //   if (!doc.text) {
    //     // debugger;
    //     // @ts-ignore
    //     doc.text = '';
    //   }
    // });
    // const amdoc = handle.docSync();
    // debugger;
    // if (!handle.amdoc) {
    //   throw new Error('NO DOC');
    // }

    // (window as any).doca = handle;
    // view.current?.destroy();
    const mySchema = new Schema({
      nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
      marks: schema.spec.marks,
    });

    const semaphore = new PatchSemaphore();
    const doChange = (
      atHeads: am.Heads,
      fn: (d: am.Doc<any>) => void
    ): am.Doc<any> => {
      const updated = am.changeAt(manager.doc, atHeads, fn);
      manager.doc = updated.newDoc;
      // handle.amdoc = updated.newDoc;
      return updated.newDoc;
      // handle.changeAt(atHeads, fn);
      // return handle.docSync();
    };
    view.current = new EditorView(parent.current, {
      state: EditorState.create({
        // doc: DOMParser.fromSchema(mySchema).parse(
        //   document.querySelector('#content')
        // ),
        schema: mySchema,
        plugins: [
          ...exampleSetup({ schema: mySchema }),
          amgPlugin(manager.doc, ['text']),
        ],
        doc: initPm(manager.doc, ['text']),
      }),
      dispatchTransaction: (tx: Transaction) => {
        const newState = semaphore.intercept(doChange, tx, view.current!.state);
        view.current!.updateState(newState);
      },
    });

    manager.onPatch = (p: DocHandlePatchPayload<any>) => {
      // const onPatch = (p: DocHandlePatchPayload<any>) => {
      const newState = semaphore.reconcilePatch(
        p.after,
        p.patches,
        view.current!.state
      );
      view.current!.updateState(newState);
    };
    // amdoc.
    // handle.on('patch', onPatch);
  }, [manager]);

  const editor = React.useCallback(el => {
    if (el && parent.current?.parentElement !== el) {
      el.appendChild(parent.current);
    }
  }, []);

  return (
    <div style={{ height: '100%' }}>
      <div key="editor" ref={editor} style={{ height: '100%' }} />
    </div>
  );
}

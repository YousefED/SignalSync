// import loadWasm from '@automerge/automerge-wasm';
// import 'prosemirror-view/style/prosemirror.css';
import * as React from 'react';
import { DocViewInner } from './DocViewAMInner';
// import wasmUrl from '../../../node_modules/@automerge/automerge-wasm/nodejs/automerge_wasm_bg.wasm';
// console.log('wasm', loadWasm);

export function DocView(props: any): JSX.Element | null {
  // const [DocViewInner, setDocViewInner] = React.useState<any>(null);
  // console.log('automerge (render)', am);
  // React.useEffect(async () => {
  //   const doc = am.init();
  //   console.log('automerge', am, doc);
  //   // debugger;
  //   // const ret = await wasmUrl(imports);
  //   // debugger;
  //   // const inner = await import('./DocViewAMInner');

  //   // setDocViewInner(inner);
  // }, []);
  // if (!DocViewInner) {
  //   return null;
  // }
  return <DocViewInner {...props} />;
}

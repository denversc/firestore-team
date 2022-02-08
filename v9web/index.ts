import { initializeApp} from '@firebase/app';
import {getFirestore, doc, getDoc, setDoc} from '@firebase/firestore';

const firebaseConfig = {
    apiKey: "***",
    authDomain: "***.firebaseapp.com",
    databaseURL: "https://***.firebaseio.com",
    projectId: "***",
    storageBucket: "***.appspot.com",
    messagingSenderId: "***",
    appId: "***"
};

initializeApp(firebaseConfig);
const db = getFirestore();

async function main() {
    const docRef = doc(db, 'coll/doc');
    await setDoc(docRef,{foo:'bar'});
    const snap = await getDoc(docRef);
    console.log(snap.data());
}

main();

import { getCountFromServer, type Query } from "firebase/firestore";

// Same `.size` as a getDocs snapshot, but Firestore returns only the number instead of every document.
export const countDocs = async (q: Query) => ({ size: (await getCountFromServer(q)).data().count });

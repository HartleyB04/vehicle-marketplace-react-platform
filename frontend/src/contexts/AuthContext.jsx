import { createContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true); // loading state to ensure children are rendered only after auth state is known

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    await user.getIdToken(true); // force refresh to detect disabled users
                    setCurrentUser(user);
                } catch (err) {
                    if (err.code === "auth/user-disabled") {
                        alert("Your account has been suspended due to a policy violation.");
                        await auth.signOut(); // force logout
                        setCurrentUser(null);
                    } else {
                        console.error(err);
                    }
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return unsubscribe; // cleanup subscription on unmount
    }, []);

    return (
        // Provide the currentUser to all children components
        <AuthContext.Provider value={{ currentUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import "./Register.css";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            setSuccess(`User ${userCredential.user.email} registered successfully!`);
            navigate("/login");
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div className="register-container">
            {/* Left side */}
            <div className="register-left">
                <div className="welcome-box">
                    <h1>Welcome!</h1>
                    <img src="/assets/logo.png" alt="Swap logo" className="welcome-logo" />
                    <h2>Swap what you have. Find what you want.</h2>
                </div>
            </div>

            {/* Right side (form) */}
            <div className="register-right">
                <form className="register-form" onSubmit={handleSubmit}>
                    <h2>Sign Up for swap</h2>

                    {/* Email input */}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    {/* Password input */}
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {/* Confirm password input */}
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />

                    {/* Submit button */}
                    <button type="submit">Create Account</button>

                    {/* Error / success messages */}
                    {error && <p className="error">{error}</p>}
                    {success && <p className="success">{success}</p>}
                </form>
            </div>
        </div>
    );
}

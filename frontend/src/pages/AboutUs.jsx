export default function AboutUs() {
    return (
        <div>
            <h2 style={{ textAlign: "left" }}>About Us</h2>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "40px" }}>
                <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "bolder" }}>Welcome to swap - the ultimate community for car lovers can connect, trade, and buy rides that they love. </p>
                    <p>From Swapping to Shopping - Find Your Next Ride. Our motto. Captures the heart of what we do, Whether you wanted to swap your current ride for something new or buy your next dream car outright, or even to just explore what is out there <strong>swap</strong> is the platform that makes it easy to find what you want.</p>
                    <p>What started as a simple swapping platform has evolved into a vibrant marketplace where auto enthusiasts <strong>connect, share their passion and help eachother to discover the perfect vehicle.</strong> It's not just about transactions but rather building a community of drivers who love the ride just as much as they love the destination.</p>
                    <p>We’re driven by trust, transparency and community. With easy to use tools, verified listing and secure communication. With <strong> swap</strong> you’re in charge of your own vehicle journey - <em>helping you to move on from what you have, to what you want faster than ever before.</em> Whether that's swapping, shopping, browsing or just connecting with fellow enthusiasts</p>
                    <p>Join our community today and experience the smarter, friendlier way to find your next ride.</p>
                    <p><strong>swap : From Swapping to Shopping - Find Your Next Ride.</strong></p>
                </div>

                <div style={{ flex: 1, textAlign: "center", marginRight: "40px" }}>
                    <img
                        src="/assets/about-us.png"
                        alt="About Us"
                        style={{ maxWidth: "90%", borderRadius: "12px" }}
                    />
                </div>
            </div>

            <div style={{textAlign: "right", marginTop:"20px", marginRight:"40px"}}>
            <h2 style={{ textAlign: "right" }}>Contact Us</h2>
            <p>Have a question, need assistance or want to connect with other car enthusiasts? <strong>We're Here to Help!</strong> </p>
            <p>At <strong>swap</strong> we value <strong>community, trust and passion for cars</strong></p>
            <p>So if you need support, our team is read to guide you!</p>

            <p><strong>Get In Touch:</strong></p>
            <ul style={{listStyleType: "none", padding: 0, margin: 0, fontSize: "inherit", lineHeight: "1.6", textAlign: "right",  marginRight: "40px"}}>
                <li>Email: swap.reporter@gmail.com</li>
                <li>Phone: +61 6767 6767</li>
            </ul>
            <p><strong>Business Hours:</strong> <br/>
            Monday - Friday: 9:00am - 5:00pm <br/>
            Saturday - Sunday: Closed</p>
            </div>

        </div>
    );
}

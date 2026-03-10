// Mock dependency
jest.mock("nodemailer", () => {
    const mockSendMail = jest.fn();
    return {
        createTransport: jest.fn(() => ({
            sendMail: mockSendMail,
        })),
        __mockSendMail: mockSendMail,
    };
});

// Import services for testing 
const nodemailer = require("nodemailer");
const { sendSuspensionEmail } = require("../../utils/email");

// Test cases
describe("sendSuspensionEmail", () => {
    let mockSendMail;
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => { });

    beforeEach(() => {
        mockSendMail = nodemailer.__mockSendMail;
        mockSendMail.mockClear();
        consoleErrorSpy.mockClear();
        consoleLogSpy.mockClear();
    });

    afterAll(() => {
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
    });

    it("should send email successfully", async () => {
        mockSendMail.mockResolvedValueOnce(true);

        await sendSuspensionEmail("user@test.com", "Test reason");

        expect(mockSendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "user@test.com",
                subject: "Your account has been suspended",
            })
        );
        expect(consoleLogSpy).toHaveBeenCalledWith("Suspension email sent to user@test.com");
    });

    it("should handle email sending error gracefully", async () => {
        mockSendMail.mockRejectedValueOnce(new Error("SMTP failed"));

        await sendSuspensionEmail("user@test.com", "Test reason");

        expect(mockSendMail).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Error sending suspension email:",
            expect.any(Error)
        );
    });
});
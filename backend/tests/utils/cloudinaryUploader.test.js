const fs = require("fs");
const { uploadFile, uploadFiles } = require("../../utils/cloudinaryUploader");
const { v2: cloudinary } = require("cloudinary");

// Mock dependencies
jest.mock("cloudinary");
jest.mock("fs");

// Test cases
describe("Cloudinary uploader", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should upload a single file and return URL", async () => {
        cloudinary.uploader.upload.mockImplementation((path, options, cb) =>
            cb(null, { secure_url: "http://mock.url/file.jpg" })
        );

        const url = await uploadFile("temp/path/file.jpg", "test-folder");
        expect(url).toBe("http://mock.url/file.jpg");
        expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
            "temp/path/file.jpg",
            { folder: "test-folder" },
            expect.any(Function)
        );
    });

    it("should upload multiple files and remove temp files", async () => {
        cloudinary.uploader.upload.mockImplementation((path, options, cb) =>
            cb(null, { secure_url: `http://mock.url/${path}` })
        );
        fs.existsSync.mockReturnValue(true);
        fs.unlink.mockImplementation((path, cb) => cb(null));

        const files = [
            { path: "file1.jpg" },
            { path: "file2.jpg" },
        ];

        const urls = await uploadFiles(files, "my-folder");
        expect(urls).toEqual(["http://mock.url/file1.jpg", "http://mock.url/file2.jpg"]);
        expect(fs.unlink).toHaveBeenCalledTimes(2);
    });
});

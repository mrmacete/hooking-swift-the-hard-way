import SwiftUI
import CryptoKit

// SwiftUI version of Francesco's CryptoTarget: the same doCryptoStuff() behind a Crypto button,
// plus an async URLSession fetch behind a Fetch button.
struct ContentView: View {
    @State private var output = ""

    func doCryptoStuff() {
        let key = SymmetricKey(data: "hello hardcoded password".data(using: .utf8)!)
        let derived = HKDF<SHA384>.deriveKey(inputKeyMaterial: key, outputByteCount: 80)
        derived.withUnsafeBytes { buf in
            output = Data(bytes: buf.baseAddress!, count: buf.count).base64EncodedString()
            print("derived: \(output)")
        }
    }

    func fetch() async {
        //let url = URL(string: "https://example.com/")!
        let url = URL(string: "http://localhost:8000/")!
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            output = "\(url) -> \((response as! HTTPURLResponse).statusCode), \(data.count) bytes"
        } catch {
            output = "\(url) -> \(error)"
        }
        print("fetch: \(output)")
    }

    var body: some View {
        VStack(spacing: 20) {
            HStack(spacing: 16) {
                Button("Crypto") { doCryptoStuff() }
                Button("Fetch") { Task { await fetch() } }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)

            Text(output)
                .font(.system(.caption, design: .monospaced))
                .textSelection(.enabled)
                .frame(minHeight: 60)
        }
        .padding()
        .frame(minWidth: 480)
    }
}

#Preview {
    ContentView()
}

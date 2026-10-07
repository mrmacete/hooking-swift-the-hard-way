import UIKit
import CryptoKit

class ViewController: UIViewController {
    func doCryptoStuff() {
        let key = SymmetricKey(data: "hello hardcoded password".data(using: .utf8)!)
        
        let derived = HKDF<SHA384>.deriveKey(inputKeyMaterial: key, outputByteCount: 80)
        
        derived.withUnsafeBytes { buf in
            print("derived: \(Data(bytes: buf.baseAddress!, count: buf.count).base64EncodedString())");
        }
    }

    @IBAction func go() {
        doCryptoStuff()
    }
}


rpc.exports.init = function () {
  const hkdfDeriveKeySym =
    "$s9CryptoKit4HKDFV9deriveKey05inputE8Material15outputByteCountAA09SymmetricE0VAH_SitFZ";

  const hkdfDeriveKey =
    Module.getGlobalExportByName(hkdfDeriveKeySym);

  Interceptor.attach(hkdfDeriveKey, {
    onEnter (args) {
      this.derivedInstance = this.context.x8;
      const inputKey = args[0];
      const hashWitness = args[3];
      console.log("\nHASH:", getTypeName(hashWitness));
      dumpSymmetricKeyContiguousBytes(inputKey,
        (bytes, length) => {
          console.log("DERIVE INPUT:");
          console.log(hexdump(bytes, { length }))
        }
      );
    },
    onLeave (retval) {
      dumpSymmetricKeyContiguousBytes(this.derivedInstance,
        (bytes, length) => {
          console.log("\nDERIVE OUTPUT:");
          console.log(hexdump(bytes, { length }))
        }
      );
    }
  });
};

let _trampoline = null;

// CryptoKit.SymmetricKey.withUnsafeBytes<A>((Swift.UnsafeRawBufferPointer) throws -> A) throws -> A
const symmetricKeyWithContiguousBytes = makeSwiftNativeFunction(
  Module.getGlobalExportByName("$s9CryptoKit12SymmetricKeyV15withUnsafeBytesyxxSWKXEKlF"),
  "void", ["pointer", "pointer", "pointer"],
  { traps: "none" }
);

// type metadata for ()
const voidTypeMetadata = Module.getGlobalExportByName("$sytN");

function dumpSymmetricKeyContiguousBytes (instance, work) {
  const callback = new NativeCallback((start, end) => {
    if (start.isNull() || end.isNull()) {
      return;
    }
    work(start, end.sub(start).toUInt32());
  }, "void", ["pointer", "pointer"]);

  symmetricKeyWithContiguousBytes(instance, NULL, NULL,
    [callback, NULL, voidTypeMetadata.add(8)]);
}

function makeSwiftNativeFunction (functionPtr, retType, argTypes) {
  const trampoline = getTrampoline();

  const wrapperFunction = new NativeFunction(trampoline, retType,
    [...argTypes, "...",
      "pointer", // self
      "pointer", // target function
      "pointer", // exception pointer
      "pointer"  // output pointer
    ],
    { traps: "none" });

  return (self, outputPtr, errorPtr, args) => {
    return wrapperFunction(...args,
      self, functionPtr,
      errorPtr, outputPtr);
  };
}

function getTrampoline () {
  if (_trampoline === null) {
    const trampolineSize = 12;
    const trampoline = Memory.alloc(Process.pageSize, { protection: "rx"});

    Memory.patchCode(trampoline, trampolineSize, code => {
      const writer = new Arm64Writer(code, { pc: trampoline });
      writer.putLdpRegRegRegOffset("x20", "x22", "sp", 0, "signed-offset");
      writer.putLdpRegRegRegOffset("x21", "x8", "sp", 16, "signed-offset");
      writer.putBrReg("x22");
      writer.flush();
    });

    _trampoline = trampoline;
  }

  return _trampoline;
}

function getTypeName (witnessTable) {
  const conformance = witnessTable.readPointer();
  const { type, kind } = getTypeRef(conformance);
  switch (kind) {
    case 0:   // direct type descriptor
    case 1: { // indirect type descriptor
      const nameField = type.add(8);
      return nameField.add(nameField.readS32()).readUtf8String();
    }
    case 2: { // direct objc class name
      return type.readUtf8String();
    }
    case 3: { // indirect objc class
      const klass = new ObjC.Object(type);
      return klass.$className;
    }
    default: {
      throw new Error(`Unsupported kind: ${kind}`);
    }
  }
}

function getTypeRef (conformance) {
  const flags = conformance.add(12).readU32();
  const kind = (flags >> 3) & 7;
  const typeRef = conformance.add(4);
  const type = typeRef.add(typeRef.readS32());

  if (kind === 1) {
    // indirect type descriptor
    return { type: type.readPointer(), kind };
  }

  return { type, kind };
}


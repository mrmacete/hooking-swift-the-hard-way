rpc.exports.init = function () {
  const dataConstructorSym =
    "$s9CryptoKit12SymmetricKeyV4dataACx_tc10Foundation15ContiguousBytesRzlufC";

  const dataConstructor =
    Module.getGlobalExportByName(dataConstructorSym);

  Interceptor.attach(dataConstructor, {
    onEnter (args) {
      this.constructedInstance = this.context.x8;
    },
    onLeave (retval) {
      dumpSymmetricKeyContiguousBytes(this.constructedInstance,
        (bytes, length) => {
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


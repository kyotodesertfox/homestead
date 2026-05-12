(async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = await provider.getSigner();
      const abi = ["function deploy(string,string,address) returns (address)"];
      const c = new ethers.Contract(
          "0xB367B1e95BB9336731809AB1CF35c3D211dc1065",
          abi,
          signer
      );
      const tx = await c.deploy(
          "Beer",
          "BEER",
          "0x202ecf228020b79bd1bfce7457c15a9831bce4d3"
      );
      const r = await tx.wait();
      console.log("BEER token deployed:", r.logs);
  })();
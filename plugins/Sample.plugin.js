var TokenContextPlugin = (function () {
    function TokenContextPlugin() {
		this.Name = "Test plugin";
		this.Description = "Simple plugin to demonstrate the plugin functionality.";
    }
    TokenContextPlugin.prototype.OnConnectionOpened = function (con) {
        
		console.log("\r\n\r\n\t!!!!!\tPLUGIN CONNECTION OPENED CALLED!\r\n\r\n");
		
		return null;
    };
    return TokenContextPlugin;
}());


module.exports = {
  plugins: [ TokenContextPlugin ]
};
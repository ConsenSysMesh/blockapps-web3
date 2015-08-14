contract Example {
  uint val;

  function set(uint new_val) {
    val = new_val;
  }

  function get() returns (uint) {
    return val;
  }
}

import React from 'react';
import Spinner from 'react-spinkit';

function Loader() {
  return (
    <div data-testid="loader" style={{height: '200px'}}>
      <Spinner
        name="cube-grid"
        style={{position: 'relative', margin: '0 auto', top: '90px'}}
      />
    </div>
  );
}

export default Loader;

import {Blocks} from 'react-loader-spinner';

export default function Loader() {
  return (
    <div data-testid="loader" style={{height: '200px'}}>
      <Blocks
        wrapperStyle={{position: 'relative', margin: '0 auto', top: '90px'}}
      />
    </div>
  );
}

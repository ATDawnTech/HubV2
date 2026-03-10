import { Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
export default function S3Upload(props: any) {
  return (
    <>
      <Upload {...props}>
        <Button icon={<UploadOutlined />}>Select files</Button>
      </Upload>
    </>
  );
}

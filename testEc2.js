const { EC2Client, DescribeInstancesCommand } = require("@aws-sdk/client-ec2");

// Replace with your actual credentials and region
const region = 'us-east-1';
const credentials = {
  accessKeyId: 'AKIA3FLD2B6ZBO3CC2HL',
  secretAccessKey: '8FNCBJCDLp2lR5v+RnjGf5LKtJy2zfhJuSP+veiT'
};

const ec2Client = new EC2Client({ region, credentials });

// Function to list all EC2 instances
const listEc2Instances = async () => {
  try {
    const data = await ec2Client.send(new DescribeInstancesCommand({}));
    const instances = data.Reservations.flatMap(reservation => reservation.Instances);
    instances.forEach(instance => {
      console.log('Instance ID:', instance.InstanceId);
      console.log('State:', instance.State.Name);
      console.log('Public IP:', instance.PublicIpAddress || 'N/A');
      console.log('Private IP:', instance.PrivateIpAddress);
      console.log('-----------------------------');
    });
  } catch (error) {
    console.error('Failed to list EC2 instances:', error);
  }
};

// Run the list function
listEc2Instances();

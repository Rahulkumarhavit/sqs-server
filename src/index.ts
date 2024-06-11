import express, { Request, Response } from 'express';
import bodyParser from "body-parser";
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import 'dotenv/config'
const app = express();
const port = process.env.PORT || 3001;
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.post('/api/queue', async (req: Request, res: Response) => {
    try {
        const sqsClient = new SQSClient({
            region: "ap-south-1",
        });

        const command = new SendMessageCommand({
            QueueUrl: "https://sqs.ap-south-1.amazonaws.com/546959324593/workerqueue",
            MessageBody: JSON.stringify(req.body),
        });

        await sqsClient.send(command);

        res.send({ message: 'Message sent to the queue' });
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: 'Failed to send message to the queue', error: error });
    }
});

app.get('/api/recieve', async (req: Request, res: Response) => {
    const sqs = new SQSClient({ region: "ap-south-1" });
    // const queueUrl = process.env.ORDER_QUEUE_URL;
    const params = {
        QueueUrl: "https://sqs.ap-south-1.amazonaws.com/546959324593/workerqueue",
        MaxNumberOfMessages: 10, // Number of messages to fetch
        WaitTimeSeconds: 20, // Long polling
        MessageAttributeNames: ["All"],
        VisibilityTimeout: 20,
    };

    try {
        const data = await sqs.send(new ReceiveMessageCommand(params));

        if (data.Messages && data.Messages.length > 0) {
            const messageIds: string[] = [];

            for (const message of data.Messages) {
                console.log("Message received: ", message.Body);

                // Process the message here (e.g., perform some business logic)

                // Delete the message after processing
                const deleteParams = {
                    QueueUrl: "https://sqs.ap-south-1.amazonaws.com/546959324593/workerqueue",
                    ReceiptHandle: message.ReceiptHandle!,
                };

                await sqs.send(new DeleteMessageCommand(deleteParams));
                messageIds.push(message.MessageId!);
            }

            res.send({ message: 'Messages processed and deleted', messageIds: messageIds });
        } else {
            res.send({ message: "No messages to process" });
        }
    } catch (error) {
        console.error("Error receiving messages: ", error);
        res.status(500).send({ message: "Error receiving messages", error: error });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
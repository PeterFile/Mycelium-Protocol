import { expect } from "chai";
import pkg from 'hardhat';
const { ethers } = pkg;

describe("TaskEscrow Contract", function () {
    // Declare variables that will be used across tests
    let taskEscrow;
    let client, agent, anotherAccount;
    const taskAmount = ethers.parseEther("1.0"); // 1 ETH for testing

    // `beforeEach` runs before each test, deploying a new contract instance
    // to ensure tests are isolated from each other.
    beforeEach(async function () {
        // Get test accounts from Hardhat's local network
        [client, agent, anotherAccount] = await ethers.getSigners();

        // Deploy a new instance of the TaskEscrow contract
        const TaskEscrowFactory = await ethers.getContractFactory("TaskEscrow");
        taskEscrow = await TaskEscrowFactory.deploy();
        await taskEscrow.waitForDeployment();
    });

    // ========================
    //      Deployment
    // ========================
    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            expect(await taskEscrow.getAddress()).to.not.be.null;
        });
    });

    // ========================
    //      createTask
    // ========================
    describe("createTask", function () {
        it("Should allow a client to create a task and lock funds", async function () {
            // Client creates a task, sending 1 ETH
            const tx = await taskEscrow.connect(client).createTask(agent.address, { value: taskAmount });
            
            // Check if the TaskCreated event was emitted with correct arguments
            await expect(tx)
                .to.emit(taskEscrow, "TaskCreated")
                .withArgs(0, client.address, agent.address, taskAmount);

            // Verify the task details stored in the contract
            const task = await taskEscrow.tasks(0);
            expect(task.id).to.equal(0);
            expect(task.client).to.equal(client.address);
            expect(task.agent).to.equal(agent.address);
            expect(task.amount).to.equal(taskAmount);
            expect(task.status).to.equal(0); // 0 corresponds to Status.Created

            // Check if the contract's balance now holds the locked funds
            const contractBalance = await ethers.provider.getBalance(await taskEscrow.getAddress());
            expect(contractBalance).to.equal(taskAmount);
        });

        it("Should revert if no funds are sent", async function () {
            // Attempt to create a task with 0 value
            await expect(
                taskEscrow.connect(client).createTask(agent.address, { value: 0 })
            ).to.be.revertedWith("Task amount must be greater than zero");
        });

        it("Should revert if the agent is the zero address", async function () {
            // Attempt to create a task with the zero address as agent
            await expect(
                taskEscrow.connect(client).createTask(ethers.ZeroAddress, { value: taskAmount })
            ).to.be.revertedWith("Agent address cannot be zero");
        });
    });

    // ... (The rest of the describe blocks for approvePayment, claimPayment, etc. are identical and do not need changes)
    // ========================
    //      approvePayment
    // ========================
    describe("approvePayment", function () {
        beforeEach(async function () {
            // Create a task first before each approval test
            await taskEscrow.connect(client).createTask(agent.address, { value: taskAmount });
        });

        it("Should allow the client to approve a task", async function () {
            const tx = await taskEscrow.connect(client).approvePayment(0);
            
            await expect(tx)
                .to.emit(taskEscrow, "PaymentApproved")
                .withArgs(0);

            const task = await taskEscrow.tasks(0);
            expect(task.status).to.equal(1); // 1 corresponds to Status.Approved
        });

        it("Should revert if a non-client tries to approve", async function () {
            await expect(
                taskEscrow.connect(anotherAccount).approvePayment(0)
            ).to.be.revertedWith("Only client can approve");
        });

        it("Should revert if approving a non-created task", async function () {
            // First, approve the task
            await taskEscrow.connect(client).approvePayment(0);
            
            // Then, try to approve it again
            await expect(
                taskEscrow.connect(client).approvePayment(0)
            ).to.be.revertedWith("Task not in Created state");
        });
    });

    // ========================
    //      claimPayment
    // ========================
    describe("claimPayment", function () {
        beforeEach(async function () {
            // Create and approve a task before each claim test
            await taskEscrow.connect(client).createTask(agent.address, { value: taskAmount });
            await taskEscrow.connect(client).approvePayment(0);
        });

        it("Should allow the agent to claim the payment", async function () {
            const agentInitialBalance = await ethers.provider.getBalance(agent.address);
            
            const tx = await taskEscrow.connect(agent).claimPayment(0);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const agentFinalBalance = await ethers.provider.getBalance(agent.address);
            
            expect(agentFinalBalance).to.equal(agentInitialBalance + taskAmount - gasUsed);

            const task = await taskEscrow.tasks(0);
            expect(task.status).to.equal(2); // 2 corresponds to Status.Paid
        });

        it("Should revert if a non-agent tries to claim", async function () {
            await expect(
                taskEscrow.connect(anotherAccount).claimPayment(0)
            ).to.be.revertedWith("Only agent can claim");
        });

        it("Should revert if claiming before approval", async function () {
            // Create a new task that is NOT approved
            await taskEscrow.connect(client).createTask(agent.address, { value: taskAmount }); // This will be task ID 1
            
            await expect(
                taskEscrow.connect(agent).claimPayment(1)
            ).to.be.revertedWith("Payment not approved");
        });
    });

    // ========================
    //   cancelTaskAndRefund
    // ========================
    describe("cancelTaskAndRefund", function () {
        beforeEach(async function () {
            // Create a task before each cancellation test
            await taskEscrow.connect(client).createTask(agent.address, { value: taskAmount });
        });

        it("Should allow the client to cancel and get a refund", async function () {
            const clientInitialBalance = await ethers.provider.getBalance(client.address);
            
            const tx = await taskEscrow.connect(client).cancelTaskAndRefund(0);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const clientFinalBalance = await ethers.provider.getBalance(client.address);
            
            expect(clientFinalBalance).to.equal(clientInitialBalance + taskAmount - gasUsed);

            const task = await taskEscrow.tasks(0);
            expect(task.status).to.equal(3); // 3 corresponds to Status.Cancelled
        });

        it("Should revert if a non-client tries to cancel", async function () {
            await expect(
                taskEscrow.connect(anotherAccount).cancelTaskAndRefund(0)
            ).to.be.revertedWith("Only client can cancel");
        });

        it("Should revert if cancelling an approved task", async function () {
            // First, approve the task
            await taskEscrow.connect(client).approvePayment(0);

            // Then, try to cancel it
            await expect(
                taskEscrow.connect(client).cancelTaskAndRefund(0)
            ).to.be.revertedWith("Can only cancel Created");
        });
    });
});
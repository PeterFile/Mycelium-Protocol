// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TaskEscrow
 * @author CWP
 * @notice Simple escrow contract: client funds a task, approves completion, agent claims payment.
 */
contract TaskEscrow {
    uint256 private nextTaskId;

    enum Status {
        Created,
        Approved,
        Paid,
        Cancelled
    }

    struct Task {
        uint256 id;
        address payable client;
        address payable agent;
        uint256 amount;
        Status status;
    }

    mapping(uint256 => Task) public tasks;

    event TaskCreated(uint256 indexed taskId, address indexed client, address indexed agent, uint256 amount);
    event PaymentApproved(uint256 indexed taskId);
    event PaymentClaimed(uint256 indexed taskId, uint256 amount);
    event TaskCancelled(uint256 indexed taskId);

    /**
     * @notice Creates a new task and locks funds in escrow.
     * @dev The value of the transaction (msg.value) is the amount locked.
     * @param _agent The address of the agent who will perform the task.
     * @return taskId The ID of the newly created task.
     */
    function createTask(address payable _agent) external payable returns (uint256) {
        require(msg.value > 0, "Task amount must be greater than zero");
        require(_agent != address(0), "Agent address cannot be zero");

        uint256 taskId = nextTaskId;
        tasks[taskId] = Task({
            id: taskId,
            client: payable(msg.sender),
            agent: _agent,
            amount: msg.value,
            status: Status.Created
        });

        nextTaskId++;
        emit TaskCreated(taskId, msg.sender, _agent, msg.value);
        return taskId;
    }

    /**
     * @notice Allows the client to approve the payment for a completed task.
     * @param _taskId The ID of the task to approve.
     */
    function approvePayment(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.client, "Only client can approve");
        require(task.status == Status.Created, "Task not in Created state");

        task.status = Status.Approved;
        emit PaymentApproved(_taskId);
    }

    /**
     * @notice Allows the agent to claim the funds after payment is approved.
     * @param _taskId The ID of the task to claim funds from.
     */
    function claimPayment(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.agent, "Only agent can claim");
        require(task.status == Status.Approved, "Payment not approved");

        uint256 paymentAmount = task.amount;
        task.status = Status.Paid;

        emit PaymentClaimed(_taskId, paymentAmount);

        (bool success, ) = task.agent.call{value: paymentAmount}("");
        require(success, "Payment transfer failed");
    }

    /**
     * @notice Allows the client to cancel the task and get a refund.
     * @dev This can only be done BEFORE the payment has been approved.
     * @param _taskId The ID of the task to cancel.
     */
    function cancelTaskAndRefund(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.client, "Only client can cancel");
        require(task.status == Status.Created, "Can only cancel Created");

        uint256 refundAmount = task.amount;
        task.status = Status.Cancelled;

        emit TaskCancelled(_taskId);

        (bool success, ) = task.client.call{value: refundAmount}("");
        require(success, "Refund transfer failed");
    }
}

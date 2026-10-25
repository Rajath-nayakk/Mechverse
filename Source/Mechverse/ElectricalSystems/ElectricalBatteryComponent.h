#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "ElectricalBatteryComponent.generated.h"

USTRUCT(BlueprintType)
struct FCrankingSimulationResult
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Battery|Cranking")
	float OpenCircuitVoltage;

	UPROPERTY(BlueprintReadOnly, Category = "Battery|Cranking")
	float CrankingCurrentAmps;

	UPROPERTY(BlueprintReadOnly, Category = "Battery|Cranking")
	float LoadedTerminalVoltage;

	UPROPERTY(BlueprintReadOnly, Category = "Battery|Cranking")
	float GroundPathVoltageDrop;

	UPROPERTY(BlueprintReadOnly, Category = "Battery|Cranking")
	bool bIsSufficientToCrank;

	FCrankingSimulationResult()
		: OpenCircuitVoltage(12.65f)
		, CrankingCurrentAmps(0.0f)
		, LoadedTerminalVoltage(12.65f)
		, GroundPathVoltageDrop(0.0f)
		, bIsSufficientToCrank(true)
	{}
};

UCLASS(ClassGroup=(Electrical), meta=(BlueprintSpawnableComponent))
class MECHVERSE_API UElectricalBatteryComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UElectricalBatteryComponent();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Battery|Specs")
	float NominalVoltage; // 12.0V or 24.0V

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Battery|Specs")
	float CapacityAmpHours; // e.g. 65.0 Ah

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Battery|State", meta=(ClampMin="0.0", ClampMax="1.0"))
	float StateOfCharge; // 0.0 to 1.0 (0% to 100%)

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Battery|Physics")
	float HealthyInternalResistance; // ~0.015 Ohms

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Battery|Physics")
	float TerminalCorrosionResistance; // Contact resistance at lead posts

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Battery|State")
	float HealthPercentage; // SOH (100% = new)

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Battery|State")
	bool bIsConnected;

	UFUNCTION(BlueprintCallable, Category = "Battery|Calculations")
	float GetOpenCircuitVoltage() const;

	UFUNCTION(BlueprintCallable, Category = "Battery|Calculations")
	float GetEffectiveInternalResistance() const;

	UFUNCTION(BlueprintCallable, Category = "Battery|Calculations")
	float GetTerminalVoltage(float DischargeCurrentAmps = 0.0f) const;

	UFUNCTION(BlueprintCallable, Category = "Battery|Simulation")
	float StepSimulation(float CurrentAmps, float DeltaTimeSeconds);

	UFUNCTION(BlueprintCallable, Category = "Battery|Simulation")
	FCrankingSimulationResult SimulateCranking(float StarterMotorResistance = 0.075f, float GroundPathResistance = 0.002f) const;
};
